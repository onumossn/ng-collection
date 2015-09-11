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
        preRequest: null,
        relsKey: null,
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
        var cache = $cacheFactory('ng-restful-collection'),
          options = angular.copy(defaults),
          preRequest = preRequest ? $injector.get(preRequest) : {
            run: function() { return $q.when(true); }
          };

        function Collection(type, params) {
          /**
           * @ngdoc property
           * @name $colletion.Collection#_meta
           *
           * @description
           * Contains information concerning the collection requests.
           * It is meant to be private.
           */
          this._meta = {
            type: type,
            url: $resourceLibrary.get(type),
            params: angular.copy(params)          
          };

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
        Collection.prototype.get = function(params) {
          var self = this,
            requestParams = angular.copy(params || {}),
            single = !!requestParams[options.idKey],
            url = self._meta.url;
          
          if (!single) {
            angular.extend(requestParams, self._meta.params);
          } else {
            var localEntity = findById(self.data.collection, requestParams[options.idKey]);

            if (localEntity) {
              return $q.resolve(angular.copy(localEntity));
            }

            url = getEntityUrl(self._meta.url, requestParams[options.idKey]);
            delete requestParams[options.idKey];
          }

          return preRequest.run()
            .then(function() {
              return $http.get(url, { params: requestParams });
            }, quickReject)
            .then(function(resp) {
              var promisedValue,
                data = resp.data;
              if(single) {
                insertIntoCollection(self.data.collection, data);
                $resourceLibrary.extend(data[options.relsKey], self._meta.type + '[' + data[options.idKey] + ']');
                promisedValue = angular.copy(data);
              } else {
                var respCollection = data[options.collectionKey];
                for (var i = 0, length = respCollection.length; i < length; i++) {
                  var entity = respCollection[i];
                  insertIntoCollection(self.data.collection, entity);
                  $resourceLibrary.extend(entity[options.relsKey], self._meta.type + '[' + entity[options.idKey] + ']');
                }
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
         * @param {Object} entity The entity to be saved.
         **/
        Collection.prototype.save = function(entity) {
          var self = this,
            url = entity[options.idKey] ?
              getEntityUrl(self._meta.url, entity[options.idKey]) : self._meta.url;
          return preRequest.run()
            .then(function() {
              var method = entity[options.idKey] ? 'put' : 'post';
              return $http[method](url, entity);
            }, quickReject)
            .then(function(resp) {
              entity = resp.data;
              insertIntoCollection(self.data.collection, entity);
              $resourceLibrary.extend(entity[options.relsKey], self._meta.type + '[' + entity[options.idKey] + ']');
              return angular.copy(entity);
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
            id = entity[options.idKey];

          return preRequest.run()
            .then(function() {
              return $http.delete(getEntityUrl(self._meta.url, entity[options.idKey]));
            }, quickReject)
            .then(function() {
              //seems weird to find something you already have, but
              //time has passed since the network request has been made
              //and the data may have changed which means that the original
              //no longer exists in the current collection
              var original = findById(self.data.collection, id),
                index = self.data.collection.indexOf(original),
                entityRels = $resourceLibrary.getWithPrefix(self._meta.type + '[' + id + ']');
              self.data.collection.splice(index, 1);

              for (var i = 0, length = entityRels.length; i < length; i++) {
                $collection(entityRels[i]).clearLocal();
              }
            }, quickReject);
        };

        Collection.prototype.clearLocal = function() {
          var self = this;
          self.data.collection = [];
          $rootScope.$emit('$collection:clear-local', self);
        };

        function quickReject(err) {
          return $q.reject(err);
        }

        function getEntityUrl(url, id) {
          return url + '/' + id;
        }

        //helper to insert entity into collection by either
        //extending currently existing entity in the collection
        //or pushing the entity into the colleciton if it does not exist
        function insertIntoCollection(collection, entity) {
          var original = findById(collection, entity[options.idKey]);
          if (original) {
            angular.extend(original, entity);
          } else {
            collection.push(entity);
          }
        }

        //helper for finding first entity in a collection by id
        function findById(collection, id) {
          var results = [],
            idKey = options.idKey;

          for (var i = 0, length = collection.length; i < length; i++) {
            if (collection[i][idKey] === id) {
              return collection[i];
            }
          }

          return null;
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


        function getCollection(type, params) {
          var key = getCacheKey(arguments),
            inCache = cache.get(key);

          if (inCache) {
            return inCache;
          }
          
          var collection = new Collection(type, params);
          cache.put(key, collection);
          return collection;
        }

        return getCollection;
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
      this.$get = function() {
        var options = angular.copy(defaults),
          links = {};

        extend(options.baseLinks);

        function extend(rels, base) {
          base = base ? base + '.' : '';

          if (angular.isArray(rels)) {
            angular.forEach(rels, function(value) {
              links[base + value.rel] = value.uri;
            });     
          } else if (angular.isObject(rels)) {
            angular.forEach(rels, function(value, key) {
              links[base + key] = value;
            });
          }
        }

        return {
          extend: extend,
          get: function(key) {
            return links[key];
          },
          getWithPrefix: function(prefix) {
            var keys = Object.keys(links),
              results = [];

            for (var i = 0, length = keys.length; i < length; i++) {
              if (keys[i].indexOf(prefix) === 0) {
                results.push(links[keys[i]]);
              }
            }

            return results;
          }
        };
      };
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
        var resource = $collection(collection.type, collection.params),
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
          refresh: function(success, error) {
            resource.clearLocal();
            return resource.get()
              .then(getCallbackHandler(success), getCallbackHandler(error));
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

      function getCallbackHandler(callback) {
        return function(resp) {
          if (callback) {
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