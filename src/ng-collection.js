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
          defer = $q.defer(),
          url = params.id ? getEntityUrl(self.meta.url, params.id) : self.meta.url;
        
        params = angular.copy(params || {});

        if (!params.id) angular.extend(params, self.meta.params);

        AuthService.authenticate().then(function() {
          $http.get(url, { params: params }).then(function(data) {
            if(params[defaults.idKey]) {
              insertIntoCollection(self.data.collection, data);
              defer.resolve(angular.copy(data));
            } else {
              self.data.collection = resp[defaults.collectionKey] || [];
              defer.resolve(angular.copy(self.data.collection));
            }
          }, function(err) {
            defer.reject(err);
          });
        }, function(err) {
          defer.reject(err);
        });


        return defer.promise;
      };

      CollectionFactory.prototype.save = function(entity) {
        var self = this,
          defer = $q.defer(),
          url = getEntityUrl(self.meta.url, entity[defaults.idKey]);
        AuthService.authenticate().then(function() {
          if(entity[defaults.idKey]) {
            var params = getDynamicKeyObject(defaults.idKey, entity.id);
            $http.put(url, entity).then(function(data) {
              insertIntoCollection(self.data.collection, data);
              defer.resolve(angular.copy(data));
            }, function(err) {
              defer.reject(err);
            });
          } else {
            $http.post(self.meta.url, entity).then(function(data) {
              self.data.collection.push(data);
              defer.resolve(angular.copy(data));
            }, function(err) {
              defer.reject(err);
            });
          }
        }, function(err) {
          defer.reject(err);
        });

        return defer.promise;
      };

      CollectionFactory.prototype.remove = function(entity) {
        var self = this,
          defer = $q.defer();

        AuthService.authenticate().then(function() {
          $http.delete(getEntityUrl(self.meta.url, entity[defaults.idKey])).then(function() {
            var original = findById(self.data.collection, entity[defaults.idKey]),
              index = self.data.collection.indexOf(original);
            self.data.collection.splice(index, 1);
            defer.resolve();
          }, function(err) {
            defer.reject(err);
          });
        }, function(err) {
          defer.reject(err);
        });

        return defer.promise;
      };

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
          resource.save(entity).then(function(data) {
            if (success) success(data);
          }, function(err) {
            if (error) error(err);  
          });
        },
        remove: function(entity, success, error) {
          resource.remove(entity).then(function(data) {
            if (success) success(data);
          }, function(err) {
            if (error) error(err);
          });
        }
      }, $scope[collectionName]);

      resource.get();
    });

    //helper incomplete camelCase
    function camelCase(string) {
      return string.replace(/\./g, ' ')
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
          if (+match === 0) return '';
          return index === 0 ? match.toLowerCase() : match.toUpperCase();
        });
    }
  })
  .directive('ngCollection', function() {
    return {
      restrict: 'A',
      controller: 'ngCollectionCtrl'
    };
  });
