var q = require('../simple-object-query');
var expect = require('chai').expect;

var src = {
    root: {
        node: [
            {a: {b: 1}},
            {a: {c: 2}},
            {a: {c: 2, d: 0}},
            {a: {c: 5}},
            {a: {d: [{e: 3},{f: 4}], t: 'a'}},
            {a: {d: [{e: 5},{f: 4}], t: 'a'}}
        ]
    }
};

var origin = {
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
},
    obj = origin;

function clone(val) {
    return JSON.parse(JSON.stringify(val));
}

describe('get', function () {
    it('should get value by * in arrays', function () {
        var obj = src;
        var arr = [obj];

        expect(q.get(obj, 'root.node.*.a.c')).to.equal(2);
        expect(q.get(obj, 'root.node.*.a.d.*.e')).to.equal(3);
        expect(q.get(obj, 'root.node.*')).to.equal(obj.root.node[0]);
        expect(q.get(arr, '*.root.node.*.a.b')).to.equal(1);
    });

    it('should get value by * in objects', function () {
        expect(q.get(obj, 'root.*.b')).to.equal(obj.root.a1.b);
        expect(q.get(obj, 'root.*.b.*.c')).to.equal(1);
        expect(q.get(obj, 'root.*')).to.equal(obj.root.a1);
    });
});

describe('where', function () {
    it('should get object from array by query not recursively', function () {
        var obj = src;

        var res = q.where(obj.root.node, {
            'a.c': 2
        });

        expect(res.length).to.equal(2);
        expect(res[0]).to.equal(obj.root.node[1]);
        expect(res[1]).to.equal(obj.root.node[2]);

        res = q.where(obj.root.node, {
            'a.c': /\d+/
        });

        expect(res.length).to.equal(3);
        expect(res[0]).to.equal(obj.root.node[1]);
        expect(res[1]).to.equal(obj.root.node[2]);
        expect(res[2]).to.equal(obj.root.node[3]);

        res = q.where(obj.root.node, {
            'a.d.*.e': 3
        });

        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(obj.root.node[4]);

        res = q.where(obj.root.node, [
            {
                'a.d.*.f': 4
            }
        ]);

        expect(res.length).to.equal(2);
        expect(res[0]).to.equal(obj.root.node[4]);
        expect(res[1]).to.equal(obj.root.node[5]);
    });

    it ('should accept query as array', function () {
        var obj = src;

        var res = q.where(obj.root.node, [
            {
                'a.t': 'a'
            },
            'a.d',
            q.flatten,
            {
                'e': 5
            }
        ]);

        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(obj.root.node[5].a.d[0]);
    });

    it('should return empty array if not find', function () {
        var obj = src;

        var res = q.where(obj.root.node, [
            {
                'a.t': 'a'
            },
            'a.d.c',
            {
                'e': 5
            }
        ]);

        expect(res.length).to.equal(0);
    });

    it('should find by function', function () {
        var data = [{item1: {item2: ['test1', 'test2']}}, {item1: {item2: ['test3', 'test4']}}, {item3: ['test1', 'test2']}];

        var res = q.where(data, {
            'item1.item2': function (arr) {
                return Array.isArray(arr) && arr.indexOf('test3') > -1;
            }
        });

        expect(res[0]).to.equal(data[1]);
    });
});

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

        var res = q.search({
            source: obj,
            query: {
                'b.0.c': 1
            },
            exclude: [
                'parent'
            ]
        });

        expect(res.length).to.equal(2);
        expect(res[0].target).to.equal(obj.root.a1);
        expect(res[1].target).to.equal(obj.root.a2);

        obj.root.a1.$name.list = obj.root;
        
        res = q.search({
            source: obj,
            query: {
                'b.0.c': 1
            },
            exclude: function (item) {
                return (
                    item.field === 'parent' ||
                    (
                        item.field === '$name' && item.path[item.path.length - 1] === 'a1' && item.target.$name.list
                    )
                );
            }
        });

        expect(res.length).to.equal(2);
        expect(res[0].target).to.equal(obj.root.a1);
        expect(res[1].target).to.equal(obj.root.a2);
    });

    it('should include fields', function () {
        var obj = clone(origin);

        var num = 0;

        q.search({
            source: obj,
            query: {
                'b.0.c': 1
            },
            include: ['root', 'a2'],
            callback: function (item) {
                num++;
            }
        });

        expect(num).to.equal(1);

        num = 0;

        q.search({
            source: obj,
            query: {
                'b.0.c': 1
            },
            include: function (item) {
                return item.field === 'root' || item.field === 'a2';
            },
            callback: function (item) {
                num++;
            }
        });

        expect(num).to.equal(1);
    });

    it('should filter by function', function () {
        var obj = clone(origin);

        var res = q.search({
            source: obj,
            query: {
                '*': function (val) {
                    expect(this.path).to.be.an('array');
                    return Array.isArray(val);
                }
            }
        });

        expect(res.length).to.equal(2);
        expect(res[0].target).to.equal(obj.root.a1);
        expect(res[1].target).to.equal(obj.root.a2);
    });

    it('should stop when return non undefined', function () {
        var obj = clone(origin);

        var res = q.search({
            source: obj,
            callback: function (item) {
                if (item.field === 'a1') {
                    return item.target;
                }
            }
        });

        expect(res).to.equal(obj.root.a1);
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

    it('should remove correctly sibling items in array', function () {
        var obj = {b: [{a: 1},{a: 1},{a: 2},{a: 1}]};

        q.replace({
            source: obj,
            query: {
                a: 1
            }
        });

        expect(obj.b.length).to.equal(1);
        expect(obj.b[0].a).to.equal(2);
    });
});