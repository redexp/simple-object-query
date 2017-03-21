# simple-object-query

[![Build Status](https://travis-ci.org/redexp/simple-object-query.svg)](https://travis-ci.org/redexp/simple-object-query)

`npm install simple-object-query`

`bower install simple-object-query`

Really simple lib to find a deep value in an object

I'll use this source object for all examples
```javascript
var source = {
    data: [
        {
            item: {
                name: 'select',
                options: {
                    length: 4,
                    property: {
                        name: 'input'
                    }
                }
            }
        },
        {
            item: {
                name: 'group',
                options: {
                    length: 2,
                    property: {
                        name: 'input'
                    }
                },
                type: 'number'
            }
        }
    ]
};
```

## get

This function will return value of deep field if it is own property. You can use `*` if you don't know exact index in array.

```javascript
var get = require('simple-object-query').get;

get(source, 'data.*.item.name'); // 'select'
get(source, 'data.1.item.name'); // 'group'
get(source, 'data.*.item.type'); // 'number'
```
Basically you will use this method only when you need a `*` because without it you can get value just with regular code.

## where

This is filter function for array. It will return all items which deep fields will be equal to query values. You can use regular expression to test deep field value.
```javascript
var where = require('simple-object-query').where;

where(source.data, {
    'item.name': /(select|group)/,
    'item.type': 'number',
    'item.options': function (value) {
    	return typeof value === 'object';
    }
});
/*
 [
   {
        item: {
            name: 'group',
            type: 'number',
            options: {...},
        }
    }
 ]
*/
```
You can do even more complicated query with array of queries. Items of this array can be one of three types:

1. `Object` - regular query
2. `Function` - should be map function which will return new value instead of previous result
3. `String` - shortcut for map function with `get` function with current query string `(item) => get(item, string)`

```javascript
var src = {
    root: {
        node: [
            {a: {b: 1}},
            {a: {c: 2}},
            {a: {d: 3, g: [{e: 3},{f: 4}]}},
            {a: {d: 3, g: [{e: 5},{f: 5}]}},
            {a: {d: 4, g: [{e: 3},{f: 4}]}},
            {a: {d: 4, g: [{e: 5},{f: 5}]}}
        ]
    }
};

var q = require('simple-object-query'),
    _ = require('underscore');

q.where(src.root.node, [
    {
        'a.d': 3
    },
    'a.g',
    _.flatten, // or lite version (single level) analog q.flatten
    {
        'e': 5
    }
]);
/*
 [
  {a: {d: 3, g: [{e: 5},{f: 5}]}}
 ]
*/
```

## find

This function will recursively find a deep object which has deep fields as in query object and their values are equal to values from query object. As values in query object you can use regular expressions.

```javascript
var find = require('simple-object-query').find;

find(source, {
    'options.property.name': 'input'
});
/*
 [
  {name: 'select', options: {...}},
  {name: 'group', options: {...}}
 ]
*/

find(source, {
    'name': 'group',
    'options.property.name': 'input'
});
/*
 [
  {name: 'group', options: {...}}
 ]
*/

find(source, {
    'options.length': /\d+/
});
/*
 [
  {name: 'select', options: {...}},
  {name: 'group', options: {...}}
 ]
*/
```

## search

Difference between `find` is that it takes parameters as object of type
```javascript
{
    source: object,
    query: object, // same object as for "find"
    exclude: array, // array of names of properties which are links to other objects in source (circular links)
    recursion: true, // deep search or not
    callback: function (object) {} // optional callback for each found target
}
```
If you will not set callback then `search` will return array of objects of next type
```javascript
{
    parent: object, // link to parent object
    field: 'string', // name of parent property of target object
    target: object, // searched object
    path: ['path', 'to', 'object'] // this path means that target is in source.path.to.object property
}
```

**Warning:** if your input object has circular links (like `parent` fields or like `previousSibling` in DOM) then you should  set path to this fields in `exclude` array to prevent endless recursion.
```javascript
var search = require('simple-object-query').search;

search({
    source: source,
    query: {
        'options.property.name': 'input'
    }
});
/*
 [
  {
    parent: {item: {...}},
    field: 'item',
    path: ['data', '0', 'item'],
    target: {name: 'select', options: {...}}
  },
  {
    parent: {item: {...}},
    field: 'item',
    path: ['data', '1', 'item'],
    target: {name: 'group', options: {...}}
  }
 ]
*/

source.data[0].item.list = source.data;

search({
    source: source,
    query: {
        'length': 2
    },
    exclude: [
        'list',
        // or more specifically
        'item.list'
    ]
});
/*
 [
  {
    parent: {name: 'group', options: {...}},
    field: 'options',
    path: ['data', '1', 'item', 'options'],
    target: {length: 2, property: {...}}
  }
 ]
*/
```

## replace

This method will replace or remove (if callback will return `undefined`) target object.
```javascript
var replace = require('simple-object-query').replace;

replace(source, {length: /\d+/}, function (target, parent, field, path) {
    return target.length > 3 ? 'test' : undefined;
});

console.log(source.data[0].item.options); // 'test'
console.log(source.data[1].item.hasOwnProperty('options')); // false
```
Off course if you don't want to remove `target` just return itself.

Instead of callback you can pass some value.
```javascript
replace(source, {length: /\d+/}, 'test');

console.log(source.data[0].item.options); // 'test'
console.log(source.data[2].item.options); // 'test'
```

Or if you will not pass anything it will remove all targets
```javascript
replace(source, {length: /\d+/});

console.log(source.data[0].item.hasOwnProperty('options')); // false
console.log(source.data[1].item.hasOwnProperty('options')); // false
```

If your `target` is in array, it will be removed correctly
```javascript
replace(source, {name: 'select'});

console.log(source.data.length); // 1
console.log(source.data[0].item.name); // 'group'
```

If you need set `exclude` parameter then you should pass all parameters as object just like for `search` only with `callback` parameter
```javascript
replace({
    source: source,
    query: {length: /\d+/},
    exclude: ['item.list'],
    callback: function (target, parent, field, path) {
        return target.length > 3 ? 'test' : undefined;
    }
});
```
