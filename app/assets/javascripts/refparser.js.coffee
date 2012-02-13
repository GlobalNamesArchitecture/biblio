# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://jashkenas.github.com/coffee-script/
//= require jquery.refparser
$ ->
 config = {
   parserUrl: "/parser/",
   iconPath : "/assets/",
   target   : "_blank",
   onSuccessfulParse : (obj, data) ->
       console.log(data) if (typeof console == "object")
   onFailedParse : (obj) ->
       console.log(obj) if (typeof console == "object")
   onError : (obj) ->
       console.log(obj) if (typeof console == "object")
 }
 $(".biblio-item").refparser(config)
 $(".biblio-input").refparser(config)