/**
 * jQuery Reference Selector
 *
 * jQuery Reference Selector is a jQuery, javascript front-end to select components of scientific citations.
 * 
 * Version 0.1
 * Janurary 22, 2012
 *
 * Copyright (c) 2012 David P. Shorthouse
 * Licensed under the MIT license.
 * http://creativecommons.org/licenses/MIT/
 **/
/*global $, jQuery, window, document */

(function($, rs){

  "use strict";

  $.unique = function(arr){
    if (!!arr[0].nodeType){
      return _old.apply(this,arguments);
    } else {
      return $.grep(arr,function(v,k){
        return $.inArray(v,arr) === k;
      });
    }
  };

  var eventName = "mouseup." + rs,
      selectors = {
       "journal" : [ "author", "date", "title", "journal", "volume", "pages", "doi" ],
       "book"    : [ "author", "date", "title", "booktitle", "pages", "edition", "editor", "publisher", "institution", "location", "isbn", "doi" ],
       "extra"   : [ "note", "container", "retrieved", "tech", "translator", "unknown", "url" ]
      },
      all_selectors = $.unique(selectors.journal.concat(selectors.book).concat(selectors.extra)),

  get_selected = function(e) {
    var sel     = "",
        range   = 0,
        newNode = {};

    if(window.getSelection) {
      sel = window.getSelection();
    } else if (document.getSelection) {
      sel = document.getSelection();
    } else if(document.selection) {
      sel = document.selection.createRange();
    }

    if($.trim(sel) !== "" && $('#' + rs + "-" + e.data.item).length === 0) {
      if(sel.getRangeAt) {
        try {
          range = sel.getRangeAt(0);
          newNode = document.createElement("span");
          newNode.setAttribute('id', rs + "-" + e.data.item);
          newNode.setAttribute('class', 'refselector-selected-item');
          newNode.setAttribute('style', get_style(e.data.settings.selector_styles[e.data.item]));
          newNode.setAttribute('title', e.data.item);
          newNode.setAttribute('data', e.data.item);
          range.surroundContents(newNode);
        } catch(err) {
          alert(e.data.settings.selector_warning);
        }
      } else {
        sel.pasteHTML('<span id="' + e.data.item + '" class="refselector-selected-item" style="' + get_style(e.data.settings.selector_styles[e.data.item]) + '" title="' + e.data.item + '" data="' + e.data.item + '">'+sel.text+'</span>');
      }
      convert_markup($(this));
    }
  },

  get_style = function(obj) {
    return JSON.stringify(obj).replace(/[{}"]/g, "").replace(",", ";");
  },

  convert_markup = function(obj) {
    var snippet = "",
        result = obj.clone();

    $.each(all_selectors, function() {
      snippet = $('[data=' + this + ']', result);
      snippet.wrap('<' + this + '>' + snippet.html() + '</' + this + '>').remove();
    });
    $('#marked-citations').val(result.html());
  },

  build_initializer = function(obj, settings) {
    var content, button, selector;

    content  = '<div class="refselector-selectors">' + settings.config_text + '</div>';
    content += '<div class="refselector-selectors-buttons"></div>';

    $.each(selectors, function(index, value) {
      value = null;
      content += '<div class="refselector-selectors-type ' + index + '"></div>';
    });

    $(settings.config_element).append(content);

    $.each(selectors, function(index, value) {
      button = '<button class="refselector-selectors-button ' + index + '">' + index + '</button>';
      $('.refselector-selectors-buttons').append(button);
      $.each(value, function() {
        selector = build_selector(this, settings);
        $('.refselector-selectors-type.' + index).append(selector);
      });
    });

    $(settings.config_element).find('.refselector-selectors-button').each(function() {
      $(this).bind('click', function(e) {
        e.preventDefault();
        $(this).addClass("selected").siblings().removeClass("selected");
        $('.refselector-selectors-type', settings.config_element).hide();
        $.each($(this).attr("class").split(/\s+/), function() {
          $('.refselector-selectors-type.' + this, settings.config_element).show();
        });
      });
      if($(this).hasClass(settings.initial_type)) { $(this).trigger('click'); }
    }).end().find('.refparser-selectors').each(function() {
      $(this).click(function(e) {
        e.preventDefault();
        $('.refparser-selectors').removeClass("selected");
        $(this).addClass("selected");
        $(obj).refselector("destroy").refselector({"config_activate" : false, "initial_selector" : $(this).text() });
      });
    });
  },

  build_selector = function(title, settings) {
    return '<span class="refparser-selectors" style="' + get_style(settings.selector_styles[title]) + '">' + title + '</span>';
  },

  methods = {
    init : function(f, options) {
      return this.each(function() {
        var self = $(this), settings = $.extend({}, $.fn[rs].defaults, options);
        if(settings.config_activate) { build_initializer(self, settings); }
        self.bind(eventName, { 'item' : settings.initial_selector, settings : settings }, get_selected);
      });
    },
    remove : function() {
      return this.each(function() {
        $(this).html($(this).text());
      });
    },
    destroy : function() {
      return this.unbind(eventName);
    },
  };

  $.fn[rs] = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === "function" || !method) {
      return methods.init.apply(this, arguments);
    } else if (typeof method === "object") {
      return methods.init.apply(this, [null, method]);
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery ' + rs );
    }
  };

  $.fn[rs].defaults = {
    'initial_type'     : 'journal',
    'initial_selector' : 'author',
    'selector_styles'  : {
      'author'      : { 'background-color' : '#8dd3c7' },
      'booktitle'   : { 'background-color' : '#ffa1ff' },
      'container'   : { 'background-color' : '#c8c8c8' },
      'date'        : { 'background-color' : '#ffffb3' },
      'doi'         : { 'background-color' : '#79fc72' },
      'edition'     : { 'background-color' : '#72f3fc' },
      'editor'      : { 'background-color' : '#7284fc', 'color' : 'white' },
      'institution' : { 'background-color' : '#ffabab' },
      'isbn'        : { 'background-color' : '#ffc054' },
      'journal'     : { 'background-color' : '#fb8072' },
      'location'    : { 'background-color' : '#948669', 'color' : 'white' },
      'note'        : { 'background-color' : '#c8c8c8' },
      'pages'       : { 'background-color' : '#fdb562' },
      'publisher'   : { 'background-color' : '#000', 'color' : 'white' },
      'retrieved'   : { 'background-color' : '#c8c8c8' },
      'tech'        : { 'background-color' : '#c8c8c8' },
      'title'       : { 'background-color' : '#bfbada' },
      'translator'  : { 'background-color' : '#c8c8c8' },
      'unknown'     : { 'background-color' : '#c8c8c8' },
      'url'         : { 'background-color' : '#c8c8c8' },
      'volume'      : { 'background-color' : '#80b1d3' }
    },
    'selector_warning' : "Your selected region overlapped with a previously created tag. Please try again.",
    'config_element' : '#refselector-initializer',
    'config_text'    : "",
    'config_activate': true
  };

}(jQuery, 'refselector'))