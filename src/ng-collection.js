angular.module('ngCollection', [])
  .provider('$collection', function() {
    this.defaults = {
      authServiceName: null,
      collectionKey: 'data',
      idKey: 'id'
    };

    this.$get = function($q, $http, $filter, $cacheFactory, $injector, $resourceLibrary) {
      var cache = $cacheFactory('ng-collection'),
        defaults = this.defaults,
        AuthService = authServiceName ? $injector.get(authServiceName) : {
          authenticate: function() { $q.when(true); }
        };

      function CollectionFactory(type, params) {
        this.meta = {
          url: $resourceLibrary.get(type),
          params: angular.copy(params)          
        };
        this.data = { collection: [] };
      }

      CollectionFactory.prototype.get = function(params) {
        var self = this,
          url = params.id ? getEntityUrl(self.meta.url, params.id) : self.meta.url;
        
        params = angular.copy(params || {});

        if (!params.id) angular.extend(params, self.meta.params);

        return AuthService.authenticate()
          .then(function() {
            return $http.get(url, { params: params });
          }, quickReject)
          .then(function(data) {
            var promisedValue;
            if(params[defaults.idKey]) {
              insertIntoCollection(self.data.collection, data);
              promisedValue = angular.copy(data);
            } else {
              self.data.collection = resp[defaults.collectionKey] || [];
              promisedValue = angular.copy(self.data.collection);
            }
            return promisedValue;
          }, quickReject);
      };

      CollectionFactory.prototype.save = function(entity) {
        var self = this,
          url = getEntityUrl(self.meta.url, entity[defaults.idKey]);
        return AuthService.authenticate()
          .then(function() {
            var method = entity[defaults.idKey] ? 'put' : 'post';
            return $http[method](url, entity);
          }, quickReject)
          .then(function(data) {
            insertIntoCollection(self.data.collection, data);
            return angular.copy(data);
          }, quickReject);
      };

      CollectionFactory.prototype.remove = function(entity) {
        var self = this;

        return AuthService.authenticate()
          .then(function() {
            return $http.delete(getEntityUrl(self.meta.url, entity[defaults.idKey]));
          }, quickReject)
          .then(function() {
            //seems weird to find something you already have, but
            //time has passed since the network request has been made
            //and the data may have changed which means that the original
            //no longer exists in the current collection
            var original = findById(self.data.collection, entity[defaults.idKey]),
              index = self.data.collection.indexOf(original);
            self.data.collection.splice(index, 1);
          }, quickReject);
      };

      function quickReject(err) { return $q.reject(err); }

      function getEntityUrl(url, id) { return url + '/' + id; }

      //helper to insert entity into collection by either
      //extending currently existing entity in the collection
      //or pushing the entity into the colleciton if it does not exist
      function insertIntoCollection(collection, entity) {
        var original = findById(collection, entity[defaults.idKey]);
        if (original)
          angular.extend(original, entity);
        else 
          collection.push(entity);
      }

      //helper for creating an object with a dynamic key value pair
      function getDynamicKeyObject(key, id) {
        var obj = {};
        obj[key] = id;
        return obj;
      }

      //helper for finding first entity in a collection by id
      //however this is suboptimal
      function findById(collection, id) {
        return $filter('filter')(self.data.collection, getDynamicKeyObject(defaults.idKey, id))[0];
      }

      //creates cache key based on type string
      //and params object converted into a string
      function getCacheKey(args) {
        var params = '';
        angular.forEach(args[1], function(value, key) {
          params += (key + value);
        });
        return args[0] + params;
      }

      return function(type, params) {
        var key = getCacheKey(arguments),
          inCache = cache.get(key);

        if(inCache) return inCache;
        
        var newCollection = new CollectionFactory(type, params);
        cache.set(key, newCollection);
        return newCollection;
      };
    };
  })
  .provider('$resourceLibrary', function() {
    this.defaults = {
      baseLinks: {}
    };

    this.$get = function($q, $cacheFactory) {
      var defaults = this.defaults,
        cache = $cacheFactory('resource-library');

      extend('', defaults.baseLinks);

      function extend(base, rels) {
        base = base ? base + '.' : '';

        if (angular.isObject(rels)) {
          rels.forEach(function(value, key) {
            cache.put(base + key, value);
          });
        } else if (angular.isArray(rels)) {
          rels.forEach(function(value) {
            cache.put(base + value.rel, value.url);
          });            
        }
      }

      return {
        extend: extend,
        get: cache.get
      };
    };
  })
  .controller('ngCollectionCtrl', function($scope, $attrs, $parse, $collection) {
    var collections = $parse($attrs.ngCollection)($scope);

    $scope.getEditCopy = angular.copy;

    angular.forEach(collections, function(collection) {
      var resource = $collection(collection.resource, collection.params),
        collectionName = camelCase(collection.resource);

      $scope[collectionName] = angular.extend({
        data: resource.data,
        save: function(entity, success, error) {
          resource.save(entity)
            .then(getPromiseHandler(success), getPromiseHandler(error));
        },
        remove: function(entity, success, error) {
          resource.remove(entity)
            .then(getPromiseHandler(success), getPromiseHandler(error));
        }
      }, $scope[collectionName]);

      resource.get();
    });

    //helper incomplete camelCase
    function camelCase(string) {
      return string.replace(/\./g, ' ')
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
          return index === 0 ? match.toLowerCase() : match.toUpperCase();
        });
    }

    function getPromiseHandler(callback) {
      return function(resp) { if (callback) callback(resp) };
    }

  })
  .directive('ngCollection', function() {
    return {
      restrict: 'A',
      controller: 'ngCollectionCtrl'
    };
  });
