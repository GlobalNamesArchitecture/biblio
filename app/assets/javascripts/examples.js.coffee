# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://jashkenas.github.com/coffee-script/
//= require jquery.refparser
$ ->
 config = {
   parserUrl: "/citations/",
   iconPath : "/assets/",
   target   : "_blank",
   onSuccessfulParse : (obj, data) -> console.log(data),
   onFailedParse : (obj) -> console.log(obj),
   onError : (obj) -> console.log(obj)
 }
 $(".biblio-item").refParser(config)
 $(".biblio-input").refParser(config)