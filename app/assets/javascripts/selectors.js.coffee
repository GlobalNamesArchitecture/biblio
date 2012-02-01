//= require jquery.grabtag
$ ->
 config = {
   multitag : false,
   tags : {
      'journal' : ["author", "date", "title", "journal", "volume", "pages", "doi" ],
      'book'    : ["author", "date", "editor", "institution"],
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