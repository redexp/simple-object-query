;(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.simpleObjectQuery = factory();
    }
}(this, function (undefined) {

    search.helpers = {
        equal: function (a, b) {
            return a === b;
        },
        regexp: function (val, rule) {
            return val === rule || rule.test(val);
        },
        callback: function (val, rule) {
            return val === rule || rule.call(this, val);
        }
    };

    return {
        find: find,
        search: search,
        match: match,
        get: get,
        where: where,
        replace: replace,
        flatten: flatten
    };

    function find(obj, query) {
        return search({source: obj, query: query}).map(itemTarget);
    }

    function where(arr, query) {
        if (arr.length === 0) return arr;

        if (isArray(query)) {
            var q;
            for (var i = 0, len = query.length; i < len; i++) {
                q = query[i];

                switch (typeof q) {
                    case 'string':
                        arr = arr.map(function (obj) {
                            return get(obj, q);
                        }).filter(notUndefined);
                        break;
                    case 'function':
                        arr = q(arr);
                        break;
                    default:
                        arr = where(arr, q);
                }
            }

            return arr;
        }

        return arr.filter(function (obj) {
            return search({source: obj, query: query, recursion: false}).length > 0;
        });
    }

    function search(ops) {
        var parent = ops.parent,
            obj = ops.source,
            queries = ops.query || {},
            list = [],
            callback = ops.callback || function (item) {
                list.push(item);
            },
            helpers = search.helpers;

        var rules = keys(queries).map(function (query) {
            var path = arrayQuery(query),
                value = queries[query],
                validator = helpers.equal;

            if (isRegExp(value)) {
                validator = helpers.regexp;
            }
            else if (typeof value === 'function') {
                validator = helpers.callback;
            }

            return {
                path: path,
                value: value,
                validator: validator
            }
        });

        var zeroRules = rules.length === 0;

        var res = match({
            parent: parent,
            source: obj,
            exclude: ops.exclude,
            include: ops.include,
            query: zeroRules ? ['*'] : rules[0].path,
            recursion: ops.recursion,
            callback: function (item) {
                var valid = zeroRules || rules.every(function (rule) {
                    return rule.validator(get(item.target, rule.path), rule.value);
                });

                if (valid) return callback(item);
            }
        });

        return ops.callback ? res : list;
    }

    function match(ops) {
        var list = [],
            parent = ops.parent,
            field = ops.field,
            obj = ops.source,
            query = ops.query,
            path = ops.path || [],
            exclude = ops.exclude,
            include = ops.include,
            recursion = ops.recursion,
            callback = ops.callback || function (item) {
                list.push(item);
            };

        var res = get(obj, query);

        if (res !== undefined) {
            res = callback({
                parent: parent,
                path: path,
                field: field,
                target: obj
            });
            
            if (res !== undefined) return res;
        }

        if (recursion === false) return list;

        if (isArray(exclude)) {
            exclude = function (item) {
                return ops.exclude.indexOf(item.field) > -1;
            };
        }

        if (isArray(include)) {
            include = function (item) {
                return ops.include.indexOf(item.field) > -1;
            };
        }

        var item = {
            parent: parent,
            path: path,
            target: obj
        };

        res = each(obj, function (val, name) {
            item.field = name;
            
            if (exclude && exclude(item)) return;
            if (include && !include(item)) return;

            if (!isObject(val) || val === parent) return;

            return match({
                parent: obj,
                field: name,
                path: add(path, name),
                exclude: exclude,
                include: include,
                source: val,
                query: query,
                callback: callback
            });
        });

        return ops.callback ? res : list;
    }

    function get(obj, path) {
        if (typeof path === 'string') {
            path = arrayQuery(path);
        }

        var name;

        for (var i = 0, len = path.length; i < len; i++) {
            if (!isObject(obj)) return;

            name = path[i];

            if (name === '*' && !has(obj, name)) {
                var restPath = path.slice(i + 1);

                if (restPath.length === 0) {
                    return first(obj);
                }

                return each(obj, function (item) {
                    return get(item, restPath);
                });
            }

            if (!has(obj, name)) return;

            obj = obj[name];
        }

        return obj;
    }

    function replace(obj, query, cb) {
        var ops;

        if (arguments.length === 1) {
            ops = obj;
            cb = ops.callback;
        }
        else {
            ops = {
                source: obj,
                query: query
            };
        }

        if (typeof cb !== 'function') {
            var funcVal = cb;
            cb = function () {
                return funcVal;
            };
        }

        ops.callback = function (item) {
            var target = cb(item.target, item.parent, item.field, item.path);

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
        };

        search(ops);
    }

    function flatten(list) {
        return Array.prototype.concat.apply([], list);
    }

    function arrayQuery(str) {
        return typeof str === 'string' ? str.split('.') : str;
    }

    function keys(obj) {
        return Object.keys(obj);
    }

    function each(obj, cb) {
        var res;

        if (isArray(obj)) {
            for (var i = 0, len = obj.length; i < len;) {
                res = cb(obj[i], i);
                
                if (res !== undefined) {
                    return res;
                }
                
                if (obj.length < len) {
                    len = obj.length;
                }
                else {
                    i++;
                }
            }
        }
        else {
            for (var field in obj) {
                if (!obj.hasOwnProperty(field)) continue;

                res = cb(obj[field], field);
                if (res !== undefined) {
                    return res;
                }
            }
        }
    }

    function first(obj) {
        return each(obj, function (val) {
            return val;
        });
    }

    function isObject(value) {
        return value !== null && typeof value === 'object';
    }

    function isRegExp(value) {
        return value instanceof RegExp;
    }

    function isArray(value) {
        return Array.isArray(value);
    }

    function has(obj, field) {
        return Object.prototype.hasOwnProperty.call(obj, field);
    }

    function add(list, field) {
        return [].concat(list, field);
    }

    function itemTarget(item) {
        return item.target;
    }

    function notUndefined(item) {
        return item !== undefined;
    }

}));