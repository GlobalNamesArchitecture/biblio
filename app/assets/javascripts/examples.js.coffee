# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://jashkenas.github.com/coffee-script/
//= require jquery.refparser
$ ->
 config = {
   iconPath : "/assets/",
   target   : "_blank",
   timeout  : 6000,
   onSuccessfulParse : (data, obj) ->
     ids = []
     for identifier in data.records[0].identifiers
       ids.push "#{identifier.type} : #{identifier.id}" if identifier.id?
     alert(ids.toString()) if ids?
 }
 $(".biblio-entry").refParser(config)