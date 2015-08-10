'use strict';

var rExcerpt = /<!-{2,} *more *-{2,}>/;
var rExcerpt2 = /<!--\s*more\s*-->/;
var rExcerpt3 = /&lt;!--\s*more\s*--&gt;/;

function excerptFilter(data){
  var content = data.content;

  console.log(content);
  if (rExcerpt.test(content)) {
    data.content = content.replace(rExcerpt, function(match, index){
      data.excerpt = content.substring(0, index).trim();
      data.more = content.substring(index + match.length).trim();

      return '<a id="more"></a>';
    });
  } else if (rExcerpt2.test(content)) {
    data.content = content.replace(rExcerpt2, function(match, index){
      data.excerpt = content.substring(0, index).trim();
      data.more = content.substring(index + match.length).trim();

      return '<a id="more"></a>';
    });
  } else if (rExcerpt3.test(content)) {
    data.content = content.replace(rExcerpt3, function(match, index){
      data.excerpt = content.substring(0, index).trim();
      data.more = content.substring(index + match.length).trim();

      return '<a id="more"></a>';
    });
  } else {
    data.excerpt = '';
    data.more = content;
  }
}

module.exports = excerptFilter;
