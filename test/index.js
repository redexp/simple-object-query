var q = require('../simple-object-query');
var expect = require('chai').expect;

var obj = origin = {
    root: {
        a1: {
            b: [
                {c: 1},
                {c: 2},
                {c: 3}
            ],
            "$name": {
                '-test': true,
                'test-': 'test asd'
            }
        },
        a2: {
            b: [
                {c: 1}
            ]
        }
    }
};

function clone(val) {
    return JSON.parse(JSON.stringify(val));
}

describe('find', function () {

    it('should find only one', function () {
        var res = q.find(obj, {
            'b.0.c': 1,
            '$name.-test': true
        });

        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(obj.root.a1);
    });

    it('should not find because of type', function () {
        var res = q.find(obj, {
            'b.0.c': 1,
            '$name.-test': 1
        });

        expect(res.length).to.equal(0);
    });

    it('should find two', function () {
        var res = q.find(obj, {
            'b.0.c': 1
        });

        expect(res.length).to.equal(2);
        expect(res[0]).to.equal(obj.root.a1);
        expect(res[1]).to.equal(obj.root.a2);
    });

    it('should find by regexp', function () {
        var res = q.find(obj, {
            '$name.test-': /asd/
        });

        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(obj.root.a1);
    });

});

describe('search', function () {

    it('should find only one', function () {
        var res = q.search({
            source: obj,
            query: {
                'b.0.c': 1,
                '$name.-test': true
            }
        });

        expect(res.length).to.equal(1);
        expect(res[0].target).to.equal(obj.root.a1);
        expect(res[0].parent).to.equal(obj.root);
        expect(res[0].field).to.equal('a1');
        expect(res[0].path).to.deep.equal(['root', 'a1']);
    });

    it('should not find because of type', function () {
        var res = q.search({
            source: obj,
            query: {
                'b.0.c': 1,
                '$name.-test': 1
            }
        });

        expect(res.length).to.equal(0);
    });

    it('should find two', function () {
        var res = q.search({
            source: obj,
            query: {
                'b.0.c': 1
            }
        });

        expect(res.length).to.equal(2);
        expect(res[0].target).to.equal(obj.root.a1);
        expect(res[1].target).to.equal(obj.root.a2);
    });

    it('should exclude recursive fields', function () {
        var obj = clone(origin);

        obj.root.a1.parent = obj.root;
        obj.root.a1.$name.list = obj.root;

        var res = q.search({
            source: obj,
            query: {
                'b.0.c': 1
            },
            exclude: [
                'parent',
                '$name.list'
            ]
        });

        expect(res.length).to.equal(2);
        expect(res[0].target).to.equal(obj.root.a1);
        expect(res[1].target).to.equal(obj.root.a2);
    });

});

describe('replace', function () {

    it('should replace only one', function () {
        var num = 0;

        var r = {test: true};

        var obj = clone(origin);

        q.replace(obj, {
            'b.0.c': 1,
            '$name.-test': true
        }, function (child, parent, field) {
            num++;

            expect(child).to.equal(obj.root.a1);
            expect(parent).to.equal(obj.root);
            expect(field).to.equal('a1');

            return r;
        });

        expect(num).to.equal(1);
        expect(obj.root.a1).to.equal(r);
        expect(obj.root.a2).to.equal(obj.root.a2);
    });

    it('should replace two', function () {
        var num = 0;

        var r = {test: true};

        var obj = clone(origin);

        q.replace(obj, {
            'b.0.c': 1
        }, function () {
            num++;

            return r;
        });

        expect(num).to.equal(2);
        expect(obj.root.a1).to.equal(r);
        expect(obj.root.a2).to.equal(r);
    });

    it('should replace with value', function () {
        var r = {test: true};

        var obj = clone(origin);

        q.replace(obj, {
            'b.0.c': 1,
            '$name.-test': true
        }, r);

        expect(obj.root.a1).to.equal(r);
        expect(obj.root.a2).to.equal(obj.root.a2);
    });

    it('should remove field', function () {
        var obj = clone(origin);

        q.replace(obj, {
            'b.0.c': 1,
            '$name.-test': true
        });

        expect(obj.root).to.not.include.keys('a1');
        expect(obj.root.a2).to.equal(obj.root.a2);
    });

    it('should remove array item', function () {
        var obj = clone(origin);

        q.replace(obj, {
            'c': 2
        });

        expect(obj.root.a1.b.length).to.equal(2);
        expect(obj.root.a1.b).to.deep.equal([{c:1}, {c:3}]);
    });

    it('should except config object', function () {
        var obj = clone(origin);

        obj.root.a1.parent = obj.root;

        q.replace({
            source: obj,
            query: {
                'b.0.c': 1,
                '$name.-test': true
            },
            exclude: ['parent']
        });

        expect(obj.root).to.not.include.keys('a1');
        expect(obj.root.a2).to.equal(obj.root.a2);
    });

});