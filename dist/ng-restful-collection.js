(function(window, angular, undefined) {
'use strict';

  angular.module('ngRestfulCollection', [])
    /**
     * @ngdoc provider
     * @name $collectionProvider
     * @description
     * Use `$collectionProvider` to change the default behavior of the {@link ngRestfulCollection.$collection $collection} factory.
     * */
    .provider('$collection', function() {
      var defaults = this.defaults = {
        collectionKey: 'data',
        idKey: 'id'
      };

      /**
       * @ngdoc factory
       * @kind function
       * @name $collection
       * @requires $q
       * @requires $http
       * @requires $filter
       * @requires $injector
       * @requires $cacheFactory
       * @requires $injector
       * @requires ngRestfulCollection.$resourceLibrary
       * 
       * @description
       * The $collection factory allows you to create a {@link $collection.Collection Collection} object
       * which contains the methods that wrap $http methods to manage a local collection copy
       * to prevent easier management of data.
       *
       * @param {string} type The name key of the resource in {@link $resourceLibrary $resourceLibrary}
       *  to use (done so to make it more easily extendable in the future).
       * @param {Object} params Any additional query params to apply to the resource.
       *  This is, also, used to uniquely identify a collection.
       **/
      this.$get = ['$q', '$http', '$filter', '$cacheFactory', '$injector', '$rootScope', '$resourceLibrary', function($q, $http, $filter, $cacheFactory, $injector, $rootScope, $resourceLibrary) {
        var cache = $cacheFactory('ng-restful-collection');

        function Collection(type, params, options) {
          /**
           * @ngdoc property
           * @name $colletion.Collection#_meta
           *
           * @description
           * Contains information concerning the collection requests.
           * It is meant to be private.
           */
          this._meta = angular.extend({},
            defaults,
            $resourceLibrary.getConfig(type),
            {
              type: type,
              params: angular.copy(params)
            },
            options);

          this._meta.configs = this._meta.configs || {};

          if (options && options.cache) {
            this._meta.cache = $cacheFactory(options.cache.name || angular.toJson(this._meta), options.cache);
          }

          /**
           * @ngdoc property
           * @name $colletion.Collection#data
           *
           * @description
           * Contains readonly data publicly accessible collection 
           * information including the collection itself.
           * Warning: Readonly is not enforced, but direct modification 
           * may have adverse effects, so be careful.
           */
          this.data = { collection: [] };
        }

         /**
         * @ngdoc method
         * @kind function
         * @name $collection.Collection#get
         * 
         * @description
         * Performs a GET request on the resource and with given params
         * and extends the local collection as needed.
         *
         * @param {Object} params Additional params to use in the specific request.
         *  If the `id` property is given, it is used as a path param instead of a query param. 
         **/
        Collection.prototype.get = function(params, skipCache) {
          var self = this,
            requestParams = angular.copy(params || {}),
            single = !!requestParams[self._meta.idKey],
            url = self._meta.getURI(self._meta, requestParams),
            cache = skipCache ? null : this._meta.cache;
          
          if (single) {
            var localEntity = self._findById(requestParams[self._meta.idKey]);

            if (localEntity) {
              return $q.resolve(angular.copy(localEntity));
            }

            url = getEntityUrl(url, requestParams[self._meta.idKey]);
            delete requestParams[self._meta.idKey];
          } else {
            angular.extend(requestParams, self._meta.params);
          }

          return $http.get(url, angular.extend({ params: requestParams }, self._meta.configs.get, cache))
            .then(function(resp) {
              var promisedValue,
                data = resp.data;
              if(single) {
                self._insertIntoCollection(data);
                promisedValue = angular.copy(data);
              } else {
                self.data.collection = data[self._meta.collectionKey] || [];
                promisedValue = angular.copy(self.data.collection);
              }
              return promisedValue;
            }, quickReject);
        };

         /**
         * @ngdoc method
         * @kind function
         * @name $collection.Collection#save
         * 
         * @description
         * Performs a POST or PUT request on the resource with the given `entity`
         * and updates the local collection with that value returned from the resource.
         * If the `entity` contains a truthy `id` property, that is used to perform a PUT.
         * Otherwise, it will perform a POST.
         *
         * @param {Object} entity The entity or a function that returns the entity to be saved.
         **/
        Collection.prototype.save = function(entity) {
          var self = this,
            url = self._meta.getURI(self._meta, {}, entity),
            method;

          if (entity[self._meta.idKey]) {
            url = getEntityUrl(url, entity[self._meta.idKey]);
          }

          method = entity[self._meta.idKey] ? 'put' : 'post';
          return $http[method](url, entity, self._meta.configs[method])
            .then(function(resp) {
              self._insertIntoCollection(resp.data);
              return angular.copy(resp.data);
            }, quickReject);
        };

         /**
         * @ngdoc method
         * @kind function
         * @name $collection.Collection#remove
         * 
         * @description
         * Performs a DELETE request on the resource with `id` property of the given `entity`,
         * and removes the `entity` from the local collection.
         *
         * @param {Object} The entity to be removed.
         **/
        Collection.prototype.remove = function(entity) {
          var self = this,
            url = self._meta.getURI(self._meta, {}, entity);

          return $http.delete(getEntityUrl(url, entity[self._meta.idKey]), self._meta.configs.delete)
            .then(function() {
              //seems weird to find something you already have, but
              //time has passed since the network request has been made
              //and the data may have changed which means that the original
              //no longer exists in the current collection
              var original = self._findById(entity[self._meta.idKey]),
                index = self.data.collection.indexOf(original);
              self.data.collection.splice(index, 1);
            }, quickReject);
        };

        Collection.prototype.clearLocal = function() {
          var self = this;
          self.data.collection = [];
          $rootScope.$emit('$collection:clear-local', self);
        };


        //helper to insert entity into collection by either
        //extending currently existing entity in the collection
        //or pushing the entity into the colleciton if it does not exist
        Collection.prototype._insertIntoCollection = function(entity) {
          var self = this;
          var original = self._findById(entity[self._meta.idKey]);
          if (original) {
            angular.extend(original, entity);
          } else { 
            self.data.collection.push(entity);
          }
        };

        //helper for finding first entity in a collection by id
        //however this is suboptimal
        Collection.prototype._findById = function(id) {
          var self = this;
          return $filter('filter')(self.data.collection, getDynamicKeyObject(self._meta.idKey, id))[0];
        };

        function quickReject(err) {
          return $q.reject(err);
        }

        function getEntityUrl(url, id) {
          return url + '/' + id;
        }

        //helper for creating an object with a dynamic key value pair
        function getDynamicKeyObject(key, id) {
          var obj = {};
          obj[key] = id;
          return obj;
        }

        //creates cache key based on type string
        //and params object converted into a string
        function getCacheKey(args) {
          var cacheKey = args[0];

          if (args[1]) {
            cacheKey += angular.toJson(args[1]);
          }

          if (args[2]) {
            cacheKey += angular.toJson(args[2]);
          }

          return cacheKey;
        }

        return function(type, params, options) {
          var key = getCacheKey(arguments),
            inCache = cache.get(key);

          if (inCache) {
            return inCache;
          }
          
          var collection = new Collection(type, params, options);
          cache.put(key, collection);
          return collection;
        };
      }];
    })
    /**
     * @ngdoc provider
     * @name $resourceLibraryProvider
     * @description
     * Use `$resourceLibraryProvider` to change the default behavior of the {@link ngRestfulCollection.$resourceLibrary $resourceLibrary} service.
     * */
    .provider('$resourceLibrary', function() {
      var defaults = this.defaults = {
        baseLinks: {}
      };

      /**
       * @ngdoc service
       * @kind function
       * @name $resourceLibrary
       * @description
       * Stores resource URIs.
       *
       * This service is to be extended to better take advantage HATEOAS.
       * */
      this.$get = ['$cacheFactory', function($cacheFactory) {
        var options = angular.copy(defaults),
          cache = $cacheFactory('resource-library');

        extend(options.baseLinks);

        function extend(rels, base) {
          base = base ? base + '.' : '';

          if (angular.isArray(rels)) {
            angular.forEach(rels, function(value) {
              cache.put(base + value.rel, buildRel(value));
            });     
          } else if (angular.isObject(rels)) {
            angular.forEach(rels, function(value, key) {
              cache.put(base + key, buildRel(value));
            });
          }
        }

        function buildRel(rel) {
          if (angular.isString(rel)) {
            rel = { uri: rel };
          }

          if (rel.configs && rel.configs.common) {
            angular.forEach(rel.configs, function(config, configKey) {
              rel.configs[configKey] = angular.extend({}, rel.configs.common, config);
            });
          }

          rel.getURI = angular.isFunction(rel.uri) ?
            rel.uri : function() { return rel.uri; };

          return rel;
        }

        return {
          extend: extend,
          get: function() { return cache.get.apply(this, arguments).uri; },
          getConfig: cache.get
        };
      }];
    })
    /**
    * @ngdoc controller
    * @name ngRestfulCollectionCtrl
    * @requires $scope
    * @requires $attrs
    * @requires $parse
    * @requires $collection
    *
    * @description
    * Exposes {@link $collection.Collection Collection} of the types and params specified in `$attrs.ngRestfulCollection`.
    * `$attrs.ngRestfulCollection` needs to contain an array of objects. The objects need have
    * a `type` property and may contain a `params` property.
    * */
    .controller('ngRestfulCollectionCtrl', ['$scope', '$attrs', '$parse', '$collection', function($scope, $attrs, $parse, $collection) {
      var collections = $parse($attrs.ngRestfulCollection)($scope);

      $scope.getEditCopy = angular.copy;

      angular.forEach(collections, function(collection) {
        var resource = $collection(collection.type, collection.params, collection.option),
          collectionName = camelCase(collection.type);

        $scope[collectionName] = angular.extend({
          data: resource.data,
          save: function(entity, success, error) {
            return resource.save(entity)
              .then(getCallbackHandler(success), getCallbackHandler(error));
          },
          remove: function(entity, success, error) {
            return resource.remove(entity)
              .then(getCallbackHandler(success), getCallbackHandler(error));
          },
          refresh: function(success, error, clearLocal) {
            if (clearLocal) {
              resource.clearLocal();
            }
            return resource.get()
              .then(getCallbackHandler(success), getCallbackHandler(error));
          }
        }, $scope[collectionName]);
        resource.get({}, collection.option && collection.option.skipCache);
      });

      //helper incomplete camelCase
      function camelCase(string) {
        return string.replace(/\./g, ' ')
          .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
            return index === 0 ? match.toLowerCase() : match.toUpperCase();
          });
      }

      function getCallbackHandler(callback) {
        return function(resp) {
          if (angular.isFunction(callback)) {
            callback(resp);
          }
        };
      }

    }])
    /**
     * @ngdoc directive
     * @name ngRestfulCollection
     * @description
     * Exposes {@link ngRestfulCollectionCtrl ngRestfulCollectionCtrl}.
     * */
    .directive('ngRestfulCollection', function() {
      return {
        restrict: 'A',
        controller: 'ngRestfulCollectionCtrl'
      };
    });
})(window, angular);
