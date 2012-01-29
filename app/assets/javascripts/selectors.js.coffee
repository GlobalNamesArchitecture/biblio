//= require jquery.grabtag
$ ->
 config = {
   multitag : false,
   onActivate : (obj, data) -> 
     $('#grabtag-output').val(data.content)
   onTagged : (obj, data) -> 
     console.log(data.tag.type + ": " + data.tag.value)
     $('#grabtag-output').val(data.content)
 }
 $(".biblio-selector").grabtag(config)

 $(".clear-button").bind 'click', (event) =>
   $(".biblio-selector").grabtag("remove")

  