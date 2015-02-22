# simple-object-query

[![Build Status](https://travis-ci.org/redexp/simple-object-query.svg)](https://travis-ci.org/redexp/simple-object-query)

`npm install simple-object-query`

`bower install simple-object-query`

Really simple lib with no need to learn some string query language.

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
                }
            }
        }
    ]
};
```

## find

```javascript
var find = require('simple-object-query').find;

find(source, {
    'options.property': 'input'
});
/*
 [
  {name: 'select', options: {...}},
  {name: 'group', options: {...}}
 ]
*/

find(source, {
    'name': 'group',
    'options.property': 'input'
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

Difference between `find` is that it takes parameters in object and returns extended object with `parent` object, `field` string and `path` array.

**Warning:** if your input object has circular links (like `parent` fields or like `previousSibling` in DOM) then you should  set path to this fields in `exclude` array to prevent endless recursion.
```javascript
var search = require('simple-object-query').search;

search({
    source: source,
    query: {
        'options.property': 'input'
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
    exclude: ['item.list']
    callback: function (target, parent, field, path) {
        return target.length > 3 ? 'test' : undefined;
    }
});
```