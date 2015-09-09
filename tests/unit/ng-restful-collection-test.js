'use strict';

beforeEach(module('ngRestfulCollection'));

describe('$collection', function () {
  var $httpBackend,
    $collection;

  beforeEach(module(function($provide) {
    $provide.factory('$resourceLibrary', function($q) {
      return {
        get: jasmine.createSpy('get').and.returnValue('a')
      };
    });
  }));

  beforeEach(inject(function(_$httpBackend_, _$collection_) {
    $httpBackend = _$httpBackend_;
    $collection = _$collection_;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should ensure only a single instance for each unique resource and params set pair', function() {
    var col1 = $collection('a', { b: 'c' }),
      col2 = $collection('a', { d: 'e' }),
      col3 = $collection('f'),
      col4 = $collection('f');

    expect(col1).not.toBe(col2);
    expect(col2).not.toBe(col3);
    expect(col1).not.toBe(col3);
    expect(col3).toBe(col4);
  });

  it('should POST when no id exists on entity', function() {
    var col = $collection('a'),
      saveEntity = { a: 'b' },
      savedEntity = { id: 1, a: 'b' };

    $httpBackend.expectPOST('a').respond(savedEntity);

    col.save(saveEntity);

    $httpBackend.flush();
    expect(col.data.collection[0]).toEqual(savedEntity);
    expect(col.data.collection.length).toBe(1);
  });

  it('should PUT when id exists on entity', function() {
    var col = $collection('a'),
      gotEntity = { id: 1, a: 'b' },
      saveEntity = { id: 1, a: 'c' };

    $httpBackend.expectGET('a/1').respond(gotEntity);
    col.get({ id: 1 });
    $httpBackend.flush();
    
    expect(col.data.collection[0]).toEqual(gotEntity);
    expect(col.data.collection.length).toBe(1);

    $httpBackend.expectPUT('a/1').respond(saveEntity);
    col.save(saveEntity);
    $httpBackend.flush();

    expect(col.data.collection[0]).toEqual(saveEntity);
    expect(col.data.collection.length).toBe(1);
  });

  it('should GET a collection with included params', function() {
    var col = $collection('a'),
      gotCollection = { data: [ { id: 1 }, { id: 2 }] };
    
    $httpBackend.expectGET('a?b=c').respond(gotCollection);
    col.get({ b: 'c' });
    $httpBackend.flush();

    expect(col.data.collection).toEqual(gotCollection.data);
  });

  it('should GET by id when an id param is given', function() {
    var col = $collection('a'),
      entity = { id: 1, a: 'b' };
    
    $httpBackend.expectGET('a/1').respond(entity);
    col.get({ id: 1 });
    $httpBackend.flush();

    expect(col.data.collection[0]).toEqual(entity);
    expect(col.data.collection.length).toBe(1);
  });

  it('should use local copy on GET by id if available', function() {
    var col = $collection('a'),
      entity = { id: 1, a: 'b' };
    
    $httpBackend.expectGET('a/1').respond(entity);
    col.get({ id: 1 });
    $httpBackend.flush();
    col.get({ id: 1 });

    expect(col.data.collection[0]).toEqual(entity);
    expect(col.data.collection.length).toBe(1);
  });

  it('should DELETE entity', function() {
    var col = $collection('a'),
      gotCollection = { data: [ { id: 1 }, { id: 2 }] };
    
    $httpBackend.expectGET('a?b=c').respond(gotCollection);
    col.get({ b: 'c' });
    $httpBackend.flush();

    expect(col.data.collection).toEqual(gotCollection.data);
    expect(col.data.collection.length).toBe(2);

    $httpBackend.expectDELETE('a/1').respond(201, '');
    col.remove({ id: 1 });
    $httpBackend.flush();

    expect(col.data.collection[0]).toEqual({ id: 2 });
    expect(col.data.collection.length).toBe(1);
  });

  it('should reject promise with on request failures', function() {
    var col = $collection('a');

    $httpBackend.expectGET('a').respond(400, '');
    $httpBackend.expectPOST('a').respond(401, '');
    $httpBackend.expectPUT('a/1').respond(403, '');
    $httpBackend.expectDELETE('a/1').respond(500, '');

    col.get().then(function() {}, function(resp) {
      expect(resp.status).toBe(400);
    });

    col.save({ }).then(function() {}, function(resp) {
      expect(resp.status).toBe(401);
    });

    col.save({ id: 1 }).then(function() {}, function(resp) {
      expect(resp.status).toBe(403);
    });

    col.remove({ id : 1 }).then(function() {}, function(resp) {
      expect(resp.status).toBe(500);
    });

    $httpBackend.flush();

    expect(col.data.collection.length).toBe(0);
  });

  it('should clear local collection', function() {
    var col = $collection('a'),
      gotCollection = { data: [ { id: 1 }, { id: 2 }] };
    
    $httpBackend.expectGET('a?b=c').respond(gotCollection);
    col.get({ b: 'c' });
    $httpBackend.flush();

    expect(col.data.collection).toEqual(gotCollection.data);

    col.clearLocal();

    expect(col.data.collection).toEqual([]);
  });
});

/****************************************************************************/

describe('$resourceLibrary', function () {
  var $resourceLibrary;

  beforeEach(inject(function(_$resourceLibrary_) {
    $resourceLibrary = _$resourceLibrary_;
  }));

  it('should get a resource for a given key', function() {
    $resourceLibrary.extend({ key: 'value' });
    expect($resourceLibrary.get('key')).toEqual('value');
  });

  it('should accept an object for extending the resources library', function() {
    $resourceLibrary.extend({ key: 'value' });
    expect($resourceLibrary.get('key')).toEqual('value');
  });

  it('should accept an array of objects for extending resources library', function() {
    $resourceLibrary.extend([{ rel: 'key', uri: 'value' }]);
    expect($resourceLibrary.get('key')).toEqual('value');
  });

  it('should set the key of the resource relative to the provided base', function() {
    $resourceLibrary.extend({ okey: 'ovalue' }, 'obase');
    expect($resourceLibrary.get('obase.okey')).toEqual('ovalue');

    $resourceLibrary.extend([{ rel: 'akey', uri: 'avalue' }], 'abase');
    expect($resourceLibrary.get('abase.akey')).toEqual('avalue');
  });
});

/****************************************************************************/

describe('ngRestfulCollectionCtrl', function () {
  var $scope,
    $controller,
    $rootScope,
    $q,
    $collection,
    mockAttrs = [ { type: 'ASDF', params: { c: 'd' } },
      { type: 'HelloBye', params: {} } ];

  beforeEach(module(function($provide) {
    $provide.factory('$collection', function($q) {
      var collections = {};

      return function(key) {
        if (!collections[key]) {
          collections[key] = {
            data: { collection: [] },
            get: jasmine.createSpy('get').and.returnValue($q.resolve(true)),
            save: jasmine.createSpy('save').and.returnValue($q.resolve(true)),
            remove: jasmine.createSpy('remove').and.returnValue($q.resolve(true)),
            clearLocal: jasmine.createSpy('clearLocal')
          };
        }
        return collections[key];
      };
    });
  }));

  beforeEach(inject(function(_$rootScope_, _$controller_, _$q_, _$collection_) {
    $q = _$q_;
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    $collection = _$collection_;

    $scope = $rootScope.$new();

    $controller('ngRestfulCollectionCtrl', {
      $scope: $scope,
      $attrs: { ngRestfulCollection: angular.toJson(mockAttrs) }
    });
  }));

  describe('initialization', function() {
    it('should add or extend a object with the name camelCase collection name on the scope for each collection', function() {
      expect($scope.aSDF).toBeDefined();
      expect($scope.helloBye).toBeDefined();
      expect($scope.aSDF).not.toBe($scope.helloBye);
    });

    it('should request initial collection', function() {
      expect($collection('ASDF').get.calls.count()).toEqual(1);
      expect($collection('HelloBye').get.calls.count()).toEqual(1);
    });

    it('should expose collection data, save, remove, and refresh', function() {
      expect($scope.aSDF.data).toEqual(jasmine.any(Object));
      expect($scope.aSDF.save).toEqual(jasmine.any(Function));
      expect($scope.aSDF.remove).toEqual(jasmine.any(Function));
      expect($scope.aSDF.refresh).toEqual(jasmine.any(Function));
      expect($scope.helloBye.data).toEqual(jasmine.any(Object));
      expect($scope.helloBye.save).toEqual(jasmine.any(Function));
      expect($scope.helloBye.remove).toEqual(jasmine.any(Function));
      expect($scope.helloBye.refresh).toEqual(jasmine.any(Function));
      expect($scope.helloBye.data).not.toBe($scope.aSDF.data);
      expect($scope.helloBye.save).not.toBe($scope.aSDF.save);
      expect($scope.helloBye.remove).not.toBe($scope.aSDF.remove);
      expect($scope.helloBye.refresh).not.toEqual($scope.aSDF.refresh);
    });
  });

  describe('behavior', function() {
    it('should call appropriate $collection function on save, remove, and refresh', function() {
      var entity = { test: 'a' },
        collection = $collection('ASDF');

      $scope.aSDF.save(entity);
      $scope.$digest();
      expect(collection.save).toHaveBeenCalledWith(entity);

      $scope.aSDF.remove(entity);
      $scope.$digest();
      expect(collection.remove).toHaveBeenCalledWith(entity);

      $scope.aSDF.refresh();
      $scope.$digest();
      expect(collection.clearLocal).toHaveBeenCalledWith();
      expect(collection.get).toHaveBeenCalledWith();
    });

    it('should accept success callbacks on save, remove, and refresh', function() {
      var entity = { test: 'a' },
        success = jasmine.createSpy('success');

      $scope.aSDF.save(entity, success);
      $scope.$digest();
      expect(success.calls.count()).toEqual(1);

      $scope.aSDF.remove(entity, success);
      $scope.$digest();
      expect(success.calls.count()).toEqual(2);

      $scope.aSDF.refresh(success);
      $scope.$digest();
      expect(success.calls.count()).toEqual(3);
    });

    it('should accept error callbacks on save, remove, and refresh', function() {
      var entity = { test: 'a' },
        success = jasmine.createSpy('success'),
        error = jasmine.createSpy('error');

      $collection('ASDF').get.and.returnValue($q.reject(false));
      $collection('ASDF').save.and.returnValue($q.reject(false));
      $collection('ASDF').remove.and.returnValue($q.reject(false));

      $scope.aSDF.save(entity, success, error);
      $scope.$digest();
      expect(error.calls.count()).toEqual(1);

      $scope.aSDF.remove(entity, success, error);
      $scope.$digest();
      expect(error.calls.count()).toEqual(2);

      $scope.aSDF.remove(entity, success, error);
      $scope.$digest();
      expect(error.calls.count()).toEqual(3);
    });
  });

});