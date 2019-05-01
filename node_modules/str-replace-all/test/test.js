'use strict';

var      chai = require('chai'),
strReplaceAll = require('../index');

describe('str replace all', function () {

  it('does not break on empty haystack', function () {
    chai.expect(strReplaceAll('a',      'b',      '')).to.equal('');
    chai.expect(strReplaceAll('a',      'abc',    '')).to.equal('');
    chai.expect(strReplaceAll('abc',    'b',      '')).to.equal('');
    chai.expect(strReplaceAll('abc',    'abc',    '')).to.equal('');
    chai.expect(strReplaceAll('a',      'aaa',    '')).to.equal('');
    chai.expect(strReplaceAll('aaa',    'b',      '')).to.equal('');
    chai.expect(strReplaceAll('aaa',    'bbb',    '')).to.equal('');
    chai.expect(strReplaceAll(' ',      ' ',      '')).to.equal('');
    chai.expect(strReplaceAll('   ',    ' ',      '')).to.equal('');
    chai.expect(strReplaceAll(' ',      '   ',    '')).to.equal('');
    chai.expect(strReplaceAll('   ',    '   ',    '')).to.equal('');
    chai.expect(strReplaceAll('\n',     '\n',     '')).to.equal('');
    chai.expect(strReplaceAll('\n',     '\n\n\n', '')).to.equal('');
    chai.expect(strReplaceAll('\n\n\n', '\n',     '')).to.equal('');
    chai.expect(strReplaceAll('\n\n\n', '\n\n\n', '')).to.equal('');
    chai.expect(strReplaceAll('"',      '"',      '')).to.equal('');
    chai.expect(strReplaceAll('"',      '"""',    '')).to.equal('');
    chai.expect(strReplaceAll('"""',    '"',      '')).to.equal('');
    chai.expect(strReplaceAll('"""',    '"""',    '')).to.equal('');
    chai.expect(strReplaceAll('\'',     '\'',     '')).to.equal('');
    chai.expect(strReplaceAll('\'',     '\'\'\'', '')).to.equal('');
    chai.expect(strReplaceAll('\'\'\'', '\'',     '')).to.equal('');
    chai.expect(strReplaceAll('\'\'\'', '\'\'\'', '')).to.equal('');
    chai.expect(strReplaceAll('$',      'x',      '')).to.equal('');
    chai.expect(strReplaceAll('$$$',    'x',      '')).to.equal('');
    chai.expect(strReplaceAll('$',      'xxx',    '')).to.equal('');
    chai.expect(strReplaceAll('.',      'x',      '')).to.equal('');
    chai.expect(strReplaceAll('...',    'x',      '')).to.equal('');
    chai.expect(strReplaceAll('.',      'xxx',    '')).to.equal('');
    chai.expect(strReplaceAll('^',      'x',      '')).to.equal('');
    chai.expect(strReplaceAll('^^^',    'x',      '')).to.equal('');
    chai.expect(strReplaceAll('^',      'xxx',    '')).to.equal('');
  });

  it('does not break on empty needle', function () {
    chai.expect(strReplaceAll('',       'a',   'a'     )).to.equal('a');
    chai.expect(strReplaceAll('',       'a',   'abc'   )).to.equal('abc');
    chai.expect(strReplaceAll('',       'abc', 'b'     )).to.equal('b');
    chai.expect(strReplaceAll('',       'abc', 'abc'   )).to.equal('abc');
    chai.expect(strReplaceAll('',       'a',   'aaa'   )).to.equal('aaa');
    chai.expect(strReplaceAll('',       'aaa', 'b'     )).to.equal('b');
    chai.expect(strReplaceAll('',       'aaa', 'bbb'   )).to.equal('bbb');
    chai.expect(strReplaceAll('',      ' ',      ' ')).to.equal(' ');
    chai.expect(strReplaceAll('',    '   ',      ' ')).to.equal(' ');
    chai.expect(strReplaceAll('',      ' ',    '   ')).to.equal('   ');
    chai.expect(strReplaceAll('',    '   ',    '   ')).to.equal('   ');
    chai.expect(strReplaceAll('',     '\n',     '\n')).to.equal('\n');
    chai.expect(strReplaceAll('',     '\n', '\n\n\n')).to.equal('\n\n\n');
    chai.expect(strReplaceAll('', '\n\n\n',     '\n')).to.equal('\n');
    chai.expect(strReplaceAll('', '\n\n\n', '\n\n\n')).to.equal('\n\n\n');
    chai.expect(strReplaceAll('',      '"',      '"')).to.equal('"');
    chai.expect(strReplaceAll('',      '"',    '"""')).to.equal('"""');
    chai.expect(strReplaceAll('',    '"""',      '"')).to.equal('"');
    chai.expect(strReplaceAll('',    '"""',    '"""')).to.equal('"""');
    chai.expect(strReplaceAll('',     '\'',     '\'')).to.equal('\'');
    chai.expect(strReplaceAll('',     '\'', '\'\'\'')).to.equal('\'\'\'');
    chai.expect(strReplaceAll('', '\'\'\'',     '\'')).to.equal('\'');
    chai.expect(strReplaceAll('', '\'\'\'', '\'\'\'')).to.equal('\'\'\'');
    chai.expect(strReplaceAll('', '$',      'x'     )).to.equal('x');
    chai.expect(strReplaceAll('', '$$$',    'x'     )).to.equal('x');
    chai.expect(strReplaceAll('', '$',      'xxx'   )).to.equal('xxx');
    chai.expect(strReplaceAll('', '.',      'x'     )).to.equal('x');
    chai.expect(strReplaceAll('', '...',    'x'     )).to.equal('x');
    chai.expect(strReplaceAll('', '.',      'xxx'   )).to.equal('xxx');
    chai.expect(strReplaceAll('', '^',      'x'     )).to.equal('x');
    chai.expect(strReplaceAll('', '^^^',    'x'     )).to.equal('x');
    chai.expect(strReplaceAll('', '^',      'xxx'   )).to.equal('xxx');
  });

  it('does not break on empty replace', function () {
    chai.expect(strReplaceAll('a',      '', 'a'     )).to.equal('');
    chai.expect(strReplaceAll('a',      '', 'abc'   )).to.equal('bc');
    chai.expect(strReplaceAll('abc',    '', 'b'     )).to.equal('b');
    chai.expect(strReplaceAll('abc',    '', 'abc'   )).to.equal('');
    chai.expect(strReplaceAll('a',      '', 'aaa'   )).to.equal('');
    chai.expect(strReplaceAll('aaa',    '', 'b'     )).to.equal('b');
    chai.expect(strReplaceAll('aaa',    '', 'bbb'   )).to.equal('bbb');
    chai.expect(strReplaceAll(' ',      '', ' '     )).to.equal('');
    chai.expect(strReplaceAll('   ',    '', ' '     )).to.equal(' ');
    chai.expect(strReplaceAll(' ',      '', '   '   )).to.equal('');
    chai.expect(strReplaceAll('   ',    '', '   '   )).to.equal('');
    chai.expect(strReplaceAll('\n',     '', '\n'    )).to.equal('');
    chai.expect(strReplaceAll('\n',     '', '\n\n\n')).to.equal('');
    chai.expect(strReplaceAll('\n\n\n', '', '\n'    )).to.equal('\n');
    chai.expect(strReplaceAll('\n\n\n', '', '\n\n\n')).to.equal('');
    chai.expect(strReplaceAll('"',      '', '"'     )).to.equal('');
    chai.expect(strReplaceAll('"',      '', '"""'   )).to.equal('');
    chai.expect(strReplaceAll('"""',    '', '"'     )).to.equal('"');
    chai.expect(strReplaceAll('"""',    '', '"""'   )).to.equal('');
    chai.expect(strReplaceAll('\'',     '', '\''    )).to.equal('');
    chai.expect(strReplaceAll('\'',     '', '\'\'\'')).to.equal('');
    chai.expect(strReplaceAll('\'\'\'', '', '\''    )).to.equal('\'');
    chai.expect(strReplaceAll('\'\'\'', '', '\'\'\'')).to.equal('');
    chai.expect(strReplaceAll('$',      '', '$'     )).to.equal('');
    chai.expect(strReplaceAll('$$$',    '', '$$$'   )).to.equal('');
    chai.expect(strReplaceAll('$',      '', 'x'     )).to.equal('x');
    chai.expect(strReplaceAll('.',      '', '.'     )).to.equal('');
    chai.expect(strReplaceAll('...',    '', '...'   )).to.equal('');
    chai.expect(strReplaceAll('.',      '', 'x'     )).to.equal('x');
    chai.expect(strReplaceAll('^',      '', '^'     )).to.equal('');
    chai.expect(strReplaceAll('^^^',    '', '^^^'   )).to.equal('');
    chai.expect(strReplaceAll('^',      '', 'x'     )).to.equal('x');
  });

  it('works with a haystack that does not contain the needle', function () {
    chai.expect(strReplaceAll('a',      'b',      'def')).to.equal('def');
    chai.expect(strReplaceAll('a',      'abc',    'def')).to.equal('def');
    chai.expect(strReplaceAll('abc',    'b',      'def')).to.equal('def');
    chai.expect(strReplaceAll('abc',    'abc',    'def')).to.equal('def');
    chai.expect(strReplaceAll('a',      'aaa',    'def')).to.equal('def');
    chai.expect(strReplaceAll('aaa',    'b',      'def')).to.equal('def');
    chai.expect(strReplaceAll('aaa',    'bbb',    'def')).to.equal('def');
    chai.expect(strReplaceAll(' ',      ' ',      'def')).to.equal('def');
    chai.expect(strReplaceAll('   ',    ' ',      'def')).to.equal('def');
    chai.expect(strReplaceAll(' ',      '   ',    'def')).to.equal('def');
    chai.expect(strReplaceAll('   ',    '   ',    'def')).to.equal('def');
    chai.expect(strReplaceAll('\n',     '\n',     'def')).to.equal('def');
    chai.expect(strReplaceAll('\n',     '\n\n\n', 'def')).to.equal('def');
    chai.expect(strReplaceAll('\n\n\n', '\n',     'def')).to.equal('def');
    chai.expect(strReplaceAll('\n\n\n', '\n\n\n', 'def')).to.equal('def');
    chai.expect(strReplaceAll('"',      '"',      'def')).to.equal('def');
    chai.expect(strReplaceAll('"',      '"""',    'def')).to.equal('def');
    chai.expect(strReplaceAll('"""',    '"',      'def')).to.equal('def');
    chai.expect(strReplaceAll('"""',    '"""',    'def')).to.equal('def');
    chai.expect(strReplaceAll('\'',     '\'',     'def')).to.equal('def');
    chai.expect(strReplaceAll('\'',     '\'\'\'', 'def')).to.equal('def');
    chai.expect(strReplaceAll('\'\'\'', '\'',     'def')).to.equal('def');
    chai.expect(strReplaceAll('\'\'\'', '\'\'\'', 'def')).to.equal('def');
    chai.expect(strReplaceAll('$',      '',       'x'  )).to.equal('x');
    chai.expect(strReplaceAll('$$$',    '',       'xxx')).to.equal('xxx');
    chai.expect(strReplaceAll('$',      '',       'x'  )).to.equal('x');
    chai.expect(strReplaceAll('.',      '',       'x'  )).to.equal('x');
    chai.expect(strReplaceAll('...',    '',       'xxx')).to.equal('xxx');
    chai.expect(strReplaceAll('.',      '',       'x'  )).to.equal('x');
    chai.expect(strReplaceAll('^',      '',       'x'  )).to.equal('x');
    chai.expect(strReplaceAll('^^^',    '',       'xxx')).to.equal('xxx');
    chai.expect(strReplaceAll('^',      '',       'x'  )).to.equal('x');
  });

  it('replaces the needle(s) in a haystack that contains the needle once', function () {
    chai.expect(strReplaceAll('a',      'b',      'a'     )).to.equal('b');
    chai.expect(strReplaceAll('a',      'abc',    'a'     )).to.equal('abc');
    chai.expect(strReplaceAll('abc',    'b',      'abc'   )).to.equal('b');
    chai.expect(strReplaceAll('abc',    'abc',    'abc'   )).to.equal('abc');
    chai.expect(strReplaceAll('a',      'aaa',    'a'     )).to.equal('aaa');
    chai.expect(strReplaceAll('aaa',    'b',      'aaa'   )).to.equal('b');
    chai.expect(strReplaceAll('aaa',    'bbb',    'aaa'   )).to.equal('bbb');
    chai.expect(strReplaceAll(' ',      ' ',      ' '     )).to.equal(' ');
    chai.expect(strReplaceAll('   ',    ' ',      '   '   )).to.equal(' ');
    chai.expect(strReplaceAll(' ',      '   ',    ' '     )).to.equal('   ');
    chai.expect(strReplaceAll('   ',    '   ',    '   '   )).to.equal('   ');
    chai.expect(strReplaceAll('\n',     '\n',     '\n'    )).to.equal('\n');
    chai.expect(strReplaceAll('\n',     '\n\n\n', '\n'    )).to.equal('\n\n\n');
    chai.expect(strReplaceAll('\n\n\n', '\n',     '\n\n\n')).to.equal('\n');
    chai.expect(strReplaceAll('\n\n\n', '\n\n\n', '\n\n\n')).to.equal('\n\n\n');
    chai.expect(strReplaceAll('"',      '"',      '"'     )).to.equal('"');
    chai.expect(strReplaceAll('"',      '"""',    '"'     )).to.equal('"""');
    chai.expect(strReplaceAll('"""',    '"',      '"""'   )).to.equal('"');
    chai.expect(strReplaceAll('"""',    '"""',    '"""'   )).to.equal('"""');
    chai.expect(strReplaceAll('\'',     '\'',     '\''    )).to.equal('\'');
    chai.expect(strReplaceAll('\'',     '\'\'\'', '\''    )).to.equal('\'\'\'');
    chai.expect(strReplaceAll('\'\'\'', '\'',     '\'\'\'')).to.equal('\'');
    chai.expect(strReplaceAll('\'\'\'', '\'\'\'', '\'\'\'')).to.equal('\'\'\'');

  });

  it('replaces the needles in a haystack that contains the needle multiple times', function () {
    chai.expect(strReplaceAll('a',      'b',      'ada'          )).to.equal('bdb');
    chai.expect(strReplaceAll('a',      'abc',    'ada'          )).to.equal('abcdabc');
    chai.expect(strReplaceAll('abc',    'b',      'abcdabc'      )).to.equal('bdb');
    chai.expect(strReplaceAll('abc',    'abc',    'abcdabc'      )).to.equal('abcdabc');
    chai.expect(strReplaceAll('a',      'aaa',    'ada'          )).to.equal('aaadaaa');
    chai.expect(strReplaceAll('aaa',    'b',      'aaadaaa'      )).to.equal('bdb');
    chai.expect(strReplaceAll('aaa',    'bbb',    'aaadaaa'      )).to.equal('bbbdbbb');
    chai.expect(strReplaceAll(' ',      ' ',      ' d '          )).to.equal(' d ');
    chai.expect(strReplaceAll('   ',    ' ',      '   d   '      )).to.equal(' d ');
    chai.expect(strReplaceAll(' ',      '   ',    ' d '          )).to.equal('   d   ');
    chai.expect(strReplaceAll('   ',    '   ',    '   d   '      )).to.equal('   d   ');
    chai.expect(strReplaceAll('\n',     '\n',     '\nd\n'        )).to.equal('\nd\n');
    chai.expect(strReplaceAll('\n',     '\n\n\n', '\nd\n'        )).to.equal('\n\n\nd\n\n\n');
    chai.expect(strReplaceAll('\n\n\n', '\n',     '\n\n\nd\n\n\n')).to.equal('\nd\n');
    chai.expect(strReplaceAll('\n\n\n', '\n\n\n', '\n\n\nd\n\n\n')).to.equal('\n\n\nd\n\n\n');
    chai.expect(strReplaceAll('"',      '"',      '"d"'          )).to.equal('"d"');
    chai.expect(strReplaceAll('"',      '"""',    '"d"'          )).to.equal('"""d"""');
    chai.expect(strReplaceAll('"""',    '"',      '"""d"""'      )).to.equal('"d"');
    chai.expect(strReplaceAll('"""',    '"""',    '"""d"""'      )).to.equal('"""d"""');
    chai.expect(strReplaceAll('\'',     '\'',     '\'d\''        )).to.equal('\'d\'');
    chai.expect(strReplaceAll('\'',     '\'\'\'', '\'d\''        )).to.equal('\'\'\'d\'\'\'');
    chai.expect(strReplaceAll('\'\'\'', '\'',     '\'\'\'d\'\'\'')).to.equal('\'d\'');
    chai.expect(strReplaceAll('\'\'\'', '\'\'\'', '\'\'\'d\'\'\'')).to.equal('\'\'\'d\'\'\'');

  });

  it('replaces the needles in a haystack that contains only the needle multiple times', function () {
    chai.expect(strReplaceAll('a',      'b',      'aa'          )).to.equal('bb');
    chai.expect(strReplaceAll('a',      'abc',    'aa'          )).to.equal('abcabc');
    chai.expect(strReplaceAll('abc',    'b',      'abcabc'      )).to.equal('bb');
    chai.expect(strReplaceAll('abc',    'abc',    'abcabc'      )).to.equal('abcabc');
    chai.expect(strReplaceAll('a',      'aaa',    'aa'          )).to.equal('aaaaaa');
    chai.expect(strReplaceAll('aaa',    'b',      'aaaaaa'      )).to.equal('bb');
    chai.expect(strReplaceAll('aaa',    'bbb',    'aaaaaa'      )).to.equal('bbbbbb');
    chai.expect(strReplaceAll(' ',      ' ',      '  '          )).to.equal('  ');
    chai.expect(strReplaceAll('   ',    ' ',      '      '      )).to.equal('  ');
    chai.expect(strReplaceAll(' ',      '   ',    '  '          )).to.equal('      ');
    chai.expect(strReplaceAll('   ',    '   ',    '      '      )).to.equal('      ');
    chai.expect(strReplaceAll('\n',     '\n',     '\n\n'        )).to.equal('\n\n');
    chai.expect(strReplaceAll('\n',     '\n\n\n', '\n\n'        )).to.equal('\n\n\n\n\n\n');
    chai.expect(strReplaceAll('\n\n\n', '\n',     '\n\n\n\n\n\n')).to.equal('\n\n');
    chai.expect(strReplaceAll('\n\n\n', '\n\n\n', '\n\n\n\n\n\n')).to.equal('\n\n\n\n\n\n');
    chai.expect(strReplaceAll('"',      '"',      '""'          )).to.equal('""');
    chai.expect(strReplaceAll('"',      '"""',    '""'          )).to.equal('""""""');
    chai.expect(strReplaceAll('"""',    '"',      '""""""'      )).to.equal('""');
    chai.expect(strReplaceAll('"""',    '"""',    '""""""'      )).to.equal('""""""');
    chai.expect(strReplaceAll('\'',     '\'',     '\'\''        )).to.equal('\'\'');
    chai.expect(strReplaceAll('\'',     '\'\'\'', '\'\''        )).to.equal('\'\'\'\'\'\'');
    chai.expect(strReplaceAll('\'\'\'', '\'',     '\'\'\'\'\'\'')).to.equal('\'\'');
    chai.expect(strReplaceAll('\'\'\'', '\'\'\'', '\'\'\'\'\'\'')).to.equal('\'\'\'\'\'\'');

  });

  it('replaces the needle with a replace equal to needle', function () {
    chai.expect(strReplaceAll('a',      'a',      'aa'          )).to.equal('aa');
    chai.expect(strReplaceAll('abc',    'abc',    'abcabc'      )).to.equal('abcabc');
    chai.expect(strReplaceAll('aaa',    'aaa',    'aaaaaa'      )).to.equal('aaaaaa');
    chai.expect(strReplaceAll('aaa',    'bbb',    'aaaaaa'      )).to.equal('bbbbbb');
    chai.expect(strReplaceAll(' ',      ' ',      '  '          )).to.equal('  ');
    chai.expect(strReplaceAll('   ',    ' ',      '      '      )).to.equal('  ');
    chai.expect(strReplaceAll(' ',      ' ',      '  '          )).to.equal('  ');
    chai.expect(strReplaceAll('   ',    '   ',    '      '      )).to.equal('      ');
    chai.expect(strReplaceAll('\n',     '\n',     '\n\n'        )).to.equal('\n\n');
    chai.expect(strReplaceAll('\n',     '\n',     '\n\n'        )).to.equal('\n\n');
    chai.expect(strReplaceAll('\n\n\n', '\n',     '\n\n\n\n\n\n')).to.equal('\n\n');
    chai.expect(strReplaceAll('\n\n\n', '\n\n\n', '\n\n\n\n\n\n')).to.equal('\n\n\n\n\n\n');
    chai.expect(strReplaceAll('"',      '"',      '""'          )).to.equal('""');
    chai.expect(strReplaceAll('"',      '"""',    '""'          )).to.equal('""""""');
    chai.expect(strReplaceAll('"""',    '"',      '""""""'      )).to.equal('""');
    chai.expect(strReplaceAll('"""',    '"""',    '""""""'      )).to.equal('""""""');
    chai.expect(strReplaceAll('\'',     '\'',     '\'\''        )).to.equal('\'\'');
    chai.expect(strReplaceAll('\'',     '\'\'\'', '\'\''        )).to.equal('\'\'\'\'\'\'');
    chai.expect(strReplaceAll('\'\'\'', '\'',     '\'\'\'\'\'\'')).to.equal('\'\'');
    chai.expect(strReplaceAll('\'\'\'', '\'\'\'', '\'\'\'\'\'\'')).to.equal('\'\'\'\'\'\'');

  });

  it('replaces the needle with a replace equal to haystack', function () {
    chai.expect(strReplaceAll('a',      'aa',            'aa'          )).to.equal('aaaa');
    chai.expect(strReplaceAll('abc',    'abcabc',        'abcabc'      )).to.equal('abcabcabcabc');
    chai.expect(strReplaceAll('aaa',    'aaaaaa',        'aaaaaa'      )).to.equal('aaaaaaaaaaaa');
    chai.expect(strReplaceAll(' ',      '  ',            '  '          )).to.equal('    ');
    chai.expect(strReplaceAll('   ',    '      ',        '      '      )).to.equal('            ');
    chai.expect(strReplaceAll('\n',     '\n\n',          '\n\n'        )).to.equal('\n\n\n\n');
    chai.expect(strReplaceAll('\n\n\n', '\n\n\n\n\n\n',  '\n\n\n\n\n\n')).to.equal('\n\n\n\n\n\n\n\n\n\n\n\n');
    chai.expect(strReplaceAll('"',      '""',            '""'          )).to.equal('""""');
    chai.expect(strReplaceAll('"""',    '""""""',        '""""""'      )).to.equal('""""""""""""');
    chai.expect(strReplaceAll('\'',     '\'\'',          '\'\''        )).to.equal('\'\'\'\'');

  });

  it('replaces the needle with a replace while needle, replace and haystack being equal', function () {
    chai.expect(strReplaceAll('a',            'a',            'a'           )).to.equal('a');
    chai.expect(strReplaceAll('abc',          'abc',          'abc'         )).to.equal('abc');
    chai.expect(strReplaceAll('abcabc',       'abcabc',       'abcabc'      )).to.equal('abcabc');
    chai.expect(strReplaceAll(' ',            ' ',            ' '           )).to.equal(' ');
    chai.expect(strReplaceAll('    ',         '    ',         '    '        )).to.equal('    ');
    chai.expect(strReplaceAll('\n',           '\n',           '\n'          )).to.equal('\n');
    chai.expect(strReplaceAll('\n\n\n\n\n\n', '\n\n\n\n\n\n', '\n\n\n\n\n\n')).to.equal('\n\n\n\n\n\n');
    chai.expect(strReplaceAll('""',           '""',           '""'          )).to.equal('""');
    chai.expect(strReplaceAll('""""',         '""""',         '""""'        )).to.equal('""""');
    chai.expect(strReplaceAll('\'',           '\'',           '\''          )).to.equal('\'');
    chai.expect(strReplaceAll('\'\'\'\'',     '\'\'\'\'',     '\'\'\'\''    )).to.equal('\'\'\'\'');
    chai.expect(strReplaceAll('$',            '$',            '$'           )).to.equal('$');
    chai.expect(strReplaceAll('$$$',          '$$$',          '$$$'         )).to.equal('$$$');
    chai.expect(strReplaceAll('+',            '+',            '+'           )).to.equal('+');
    chai.expect(strReplaceAll('+++',          '+++',          '+++'         )).to.equal('+++');
    chai.expect(strReplaceAll('?',            '?',            '?'           )).to.equal('?');
    chai.expect(strReplaceAll('???',          '???',          '???'         )).to.equal('???');
    chai.expect(strReplaceAll('#',            '#',            '#'           )).to.equal('#');
    chai.expect(strReplaceAll('###',          '###',          '###'         )).to.equal('###');
    chai.expect(strReplaceAll('(',            '(',            '('           )).to.equal('(');
    chai.expect(strReplaceAll('(((',          '(((',          '((('         )).to.equal('(((');
    chai.expect(strReplaceAll('[',            '[',            '['           )).to.equal('[');
    chai.expect(strReplaceAll('[[[',          '[[[',          '[[['         )).to.equal('[[[');
    chai.expect(strReplaceAll('.',            '.',            '.'           )).to.equal('.');
    chai.expect(strReplaceAll('...',          '...',          '...'         )).to.equal('...');
    chai.expect(strReplaceAll('^',            '^',            '^'           )).to.equal('^');
    chai.expect(strReplaceAll('^^^',          '^^^',          '^^^'         )).to.equal('^^^');
    chai.expect(strReplaceAll('\\w',          '\\w',          '\\w'         )).to.equal('\\w');
    chai.expect(strReplaceAll('\\w\\w\\w',    '\\w\\w\\w',    '\\w\\w\\w'   )).to.equal('\\w\\w\\w');
  });

  it('passes extra redundant tests for notoriously troubling $ characters', function () {
    chai.expect(strReplaceAll('$',    '',     '$'   )).to.equal('');
    chai.expect(strReplaceAll('$',    '$',    '$'   )).to.equal('$');
    chai.expect(strReplaceAll('$$$$', '$$$$', '$$$$')).to.equal('$$$$');
    chai.expect(strReplaceAll('$$$',  '$$$',  '$$$' )).to.equal('$$$');
    chai.expect(strReplaceAll('$$$',  '',     '$$$' )).to.equal('');
  });

});
