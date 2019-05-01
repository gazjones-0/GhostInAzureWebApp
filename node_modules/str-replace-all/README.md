str-replace-all
===============
Replaces all occurences of a string in another string.


Installation
------------
````
npm install --save str-replace-all
````


Arguments
---------
### needle
The string to be searched for

### replace
The string which replaces the needle string.

### haystack
The string which is searched for the needle string.


Usage
-----
````
var strReplaceAll = require('str-replace-all');
strReplaceAll('lorem ipsum lorem ipsum lorem ipsum', 'ipsum', 'lorem');
  => "lorem lorem lorem lorem lorem lorem"
````
