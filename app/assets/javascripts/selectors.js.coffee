//= require jquery.grabtag
$ ->
 config = {
   multitag : false,
   tags : {
       "journal" : [
         { "author"  : { 'background-color' : '#8dd3c7' }},
         { "date"    : { 'background-color' : '#ffa1ff' }},
         { "title"   : { 'background-color' : '#ffffb3' }},
         { "journal" : { 'background-color' : '#79fc72' }},
         { "volume"  : { 'background-color' : '#72f3fc' }},
         { "pages"   : { 'background-color' : '#7284fc', 'color' : '#fff' }},
         { "doi"     : { 'background-color' : '#ffabab' }} ],
       "book" : [
         { "author"      : { 'background-color' : '#8dd3c7' }},
         { "date"        : { 'background-color' : '#ffa1ff' }},
         { "title"       : { 'background-color' : '#ffffb3' }},
         { "booktitle"   : { 'background-color' : '#d19a41', 'color' : '#fff' }},
         { "pages"       : { 'background-color' : '#7284fc', 'color' : '#fff' }},
         { "edition"     : { 'background-color' : '#fb8072' }},
         { "editor"      : { 'background-color' : '#948669', 'color' : '#fff' }},
         { "publisher"   : { 'background-color' : '#fdb562' }},
         { "institution" : { 'background-color' : '#000', 'color' : '#fff' }},
         { "location"    : { 'background-color' : '#bfbada' }},
         { "isbn"        : { 'background-color' : '#80b1d3' }},
         { "doi"         : { 'background-color' : '#ffabab' }} ],
       "extra" : [ "note", "container", "retrieved", "tech", "translator", "unknown", "url" ]
   },
   active_group : 'journal',
   active_tag   : 'author',
   onActivate : (obj, data) -> 
     $('#grabtag-output').val(data.content)
   onTagged : (obj, data) -> 
     console.log(data.tag.type + ": " + data.tag.value)
     $('#grabtag-output').val(data.content)
 }
 $(".biblio-selector").grabtag(config)

 $(".clear-button").bind 'click', (event) =>
   $(".biblio-selector").grabtag("remove_all")