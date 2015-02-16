;(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.simpleObjectQuery = factory();
    }
}(this, function () {

    search.helpers = {
        equal: function (a, b) {
            return a === b;
        },
        regexp: function (val, rule) {
            return rule.test(val);
        }
    };

    return {
        find: find,
        search: search,
        match: match,
        get: get,
        replace: replace
    };

    function find(obj, query) {
        return search({source: obj, query: query}).map(function (item) {
            return item.target;
        });
    }

    function search(ops) {
        var parent = ops.parent,
            obj = ops.source,
            queries = ops.query;

        var rules = keys(queries).map(function (query) {
            return {
                path: arrayQuery(query),
                value: queries[query]
            }
        });

        var res = match({
            parent: parent,
            source: obj,
            query: rules[0].path
        });

        var helpers = search.helpers;

        return res.filter(function (item) {
            return rules.every(function (rule) {
                var helper = helpers.equal;

                if (isRegExp(rule.value)) {
                    helper = helpers.regexp;
                }

                return helper(get(item.target, rule.path), rule.value);
            });
        });
    }

    function match(ops) {
        var list = [],
            parent = ops.parent,
            field = ops.field,
            obj = ops.source,
            query = ops.query;

        var res = get(obj, query);

        if (res !== undefined) {
            list.push({
                parent: parent,
                field: field,
                target: obj
            });
        }

        var val;

        for (var name in obj) {
            val = obj[name];

            if (typeof val === 'object') {
                val = match({
                    parent: obj,
                    field: name,
                    source: val,
                    query: query
                });

                if (val.length) {
                    list = list.concat(val);
                }
            }
        }

        return list;
    }

    function get(obj, path) {
        if (typeof path === 'string') {
            path = arrayQuery(path);
        }

        var name;

        for (var i = 0, len = path.length; i < len; i++) {
            name = path[i];

            if (typeof obj !== 'object' || !obj.hasOwnProperty(name)) return;

            obj = obj[name];
        }

        return obj;
    }

    function replace(obj, queries, func) {
        if (typeof func !== 'function') {
            var funcVal = func;
            func = function () {
                return funcVal;
            };
        }

        search({source: obj, query: queries}).forEach(function (item) {
            var target = func(item.target, item.parent, item.field);

            if (target === undefined) {
                if (isArray(item.parent)) {
                    item.parent.splice(item.field, 1);
                }
                else {
                    delete item.parent[item.field];
                }
            }
            else {
                item.parent[item.field] = target;
            }
        });
    }

    function arrayQuery(str) {
        return str.split('.');
    }

    function keys(obj) {
        return Object.keys(obj);
    }

    function isRegExp(value) {
        return value instanceof RegExp;
    }

    function isArray(value) {
        return Array.isArray(value);
    }

}));