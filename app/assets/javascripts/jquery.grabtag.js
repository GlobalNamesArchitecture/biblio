/**
 * jQuery Grab Tag
 *
 * A tool to highlight and tag parts of text
 * 
 * Version 0.1
 * January 22, 2012
 *
 * Copyright (c) 2012 David P. Shorthouse
 * Licensed under the MIT license.
 * http://creativecommons.org/licenses/MIT/
 **/
/*global $, jQuery, window, document, alert */

(function($, gt){

  "use strict";

  $.unique = function(arr) {
    if (!!arr[0].nodeType) {
      return _old.apply(this,arguments);
    } else {
      return $.grep(arr,function(v,k) {
        return $.inArray(v,arr) === k;
      });
    }
  };

  var eventName       = "mouseup." + gt,
      eventNameResize = "mouseup." + gt + "-resize",
      selectors       = {
       "journal" : [ "author", "date", "title", "journal", "volume", "pages", "doi" ],
       "book"    : [ "author", "date", "title", "booktitle", "pages", "edition", "editor", "publisher", "institution", "location", "isbn", "doi" ],
       "extra"   : [ "note", "container", "retrieved", "tech", "translator", "unknown", "url" ]
      },
      all_selectors   = $.unique(selectors.journal.concat(selectors.book).concat(selectors.extra)),

  get_style = function(obj) {
    return JSON.stringify(obj).replace(/[{}"]/g, "").replace(",", ";");
  },

  convert_markup = function(obj) {
    var snippet = "",
        result  = $(obj).clone();

    $.each(all_selectors, function() {
      var tag = this;
      snippet = $('[data-' + gt + '=' + tag + ']', result);
      snippet.each(function() {
        $(this).prev(".grabtag-resizer").remove().end()
               .next(".grabtag-resizer").remove().end()
               .wrap('<' + tag + '>' + $(this).text() + '</' + tag + '>').remove();
      });
    });
    return result.html();
  },

  clear_selections = function() {
    var sel;

    if(document.selection && document.selection.empty){
      document.selection.empty() ;
    } else if(window.getSelection) {
      sel = window.getSelection();
    } else if(document.getSelection) {
      sel = document.getSelection();
    }
    if(sel && sel.removeAllRanges) { sel.removeAllRanges(); }
  },

  build_resizer = function(type) {
    return '<span class="' + gt + '-resizer ' + gt + '-resizer-' + type + '"></span>';
  },

  get_selections = function() {
    var sel;

    if(window.getSelection) {
      sel = window.getSelection();
    } else if (document.getSelection) {
      sel = document.getSelection();
    } else if(document.selection) {
      sel = document.selection.createRange();
    }
    return sel;
  },

  build_selector = function(title, innerContent, settings, selectable) {
    var classes = gt + '-selector', data = "";
    innerContent = innerContent || "";
    if(selectable) { classes += ' ' + gt + '-tag'; data = 'data-' + gt +'=' + title; }
    return '<span class="' + classes + '" style="' + get_style(settings.tags[title] || settings.base_styles[title]) + '" title="' + title + '"' + data + '>' + innerContent + '</span>';
  },

  add_resizers = function(obj, settings, newNode) {
    var resizer_w = build_resizer('w'),
        resizer_e = build_resizer('e');

    if($(newNode).children('.' + gt + '-resizer').length === 0) {
      $(newNode).prepend(resizer_w).append(resizer_e);
    }

//TODO: need to detect resize direction

    $('.' + gt + '-resizer').mousedown(function() {
      var self       = $(this),
          tag        = obj[0].children[$(this).parent().index()],
          sel        = get_selections(),
          range      = document.createRange(),
          spill      = 0,
          contents   = "";

      clear_selections();
      $(obj)[gt]("destroy");

      $(obj).unbind(eventNameResize).bind(eventNameResize, function() {
        spill = sel.getRangeAt(0).toString().length;

        try {
          if(self.hasClass(gt + "-resizer-e")) {
            range.setStart(tag.childNodes[1], 0);
            range.setEnd(tag.nextSibling, spill);
          } else {
            range.setStart(tag.previousSibling, tag.previousSibling.length-spill);
            range.setEnd(tag, 2);
          }
          sel.addRange(range);
          contents = range.extractContents().textContent;
          clear_selections();
          newNode = $(build_selector($(tag).attr("title"), contents, settings, true));
          $(tag).before(newNode).remove();
          add_resizers($(this), settings, newNode);
          $(this).unbind(eventNameResize).bind(eventName, { 'settings' : settings }, tag_selected);
          settings.onTagged.call(this, $(this), { "tag" : { "type" : settings.active_tag, "value" : contents }, "content" : convert_markup(this) });
        } catch(err) {
          clear_selections();
          settings.onOverlapWarning.call();
          return;
        }
      });

    });
  },

  preloader = function(obj, settings) {
    $.each(all_selectors, function() {
      var tag = this, snippet, style;
      snippet = $('[data-' + gt + '=' + tag + ']', obj);
      style = get_style(settings.tags[tag] || settings.base_styles[tag]);
      if(snippet.length > 1 && !settings.multitag) {
        $(snippet[0]).addClass(gt + '-selector ' + gt + '-tag').attr('title', tag).attr('style', style);
        add_resizers($(obj), settings, $(snippet[0]));
      } else {
        snippet.each(function() {
          $(this).addClass(gt + '-selector ' + gt + '-tag').attr('title', tag).attr('style', style);
          add_resizers($(obj), settings, $(this));
        });
      }
    });
    settings.onActivate.call(this, obj, { "content" : convert_markup(obj) });
  },

  tag_selected = function(e) {
    var sel, range, newNode, settings = e.data.settings;

    sel = get_selections();

    if(!settings.multitag && $('.' + gt + '-tag[data-' + gt + '=' + settings.active_tag + ']', $(this)).length === 1) {
      clear_selections();
      settings.onMultitagWarning.call();
      return;
    }

    if($.trim(sel) !== "") {
      settings.beforeTagged.call(this, $(this));
      newNode = $(build_selector(settings.active_tag, false, settings, true));

      if(sel.getRangeAt) {
        try {
          range = sel.getRangeAt(0);
          range.surroundContents(newNode[0]);
          if($(newNode).parent('.' + gt + '-selector').length > 0) {
            $(newNode).before(range.toString()).remove();
            settings.onOverlapWarning.call();
          } else {
            add_resizers($(this), settings, newNode);
//TODO: get offset for tagged item and add to tag object
            settings.onTagged.call(this, $(this), { "tag" : { "type" : settings.active_tag, "value" : range.toString() }, "content" : convert_markup(this) });
          }
        } catch(err) {
          clear_selections();
          settings.onOverlapWarning.call();
          return;
        }
      } else { //IE < 9
        alert("Sory, Internet Explorer < 9 is not supported.");
      }
    }

    clear_selections();
  },

  build_initializer = function(obj, settings) {
    var content, button, selector;

    content  = '<div class="' + gt + '-selectors-buttons"></div>';

    $.each(selectors, function(index, value) {
      value = null;
      content += '<div class="' + gt + '-selectors-type ' + index + '"></div>';
    });

    $(settings.config_ele).append(content);

    $.each(selectors, function(index, value) {
      button = '<button class="' + gt + '-selectors-button ' + index + '">' + index + '</button>';
      $('.' + gt + '-selectors-buttons').append(button);
      $.each(value, function() {
        selector = build_selector(this, this, settings);
        $('.' + gt + '-selectors-type.' + index).append(selector);
      });
    });

    $(settings.config_ele).find('.' + gt + '-selectors-button').each(function() {
      $(this).bind('click', function(e) {
        e.preventDefault();
        $(this).addClass("selected").siblings().removeClass("selected");
        $('.' + gt + '-selectors-type', settings.config_ele).hide();
        $.each($(this).attr("class").split(/\s+/), function() {
          $('.' + gt + '-selectors-type.' + this, settings.config_ele).show();
        });
      });
      if($(this).hasClass(settings.active_group)) { $(this).trigger('click'); }
    }).end().find('.' + gt + '-selector', '.' + gt + '-selectors-type').each(function() {
        if($(this).text() === settings.active_tag) { $(this).addClass('selected'); }
        $(this).click(function(e) {
          var self = $(this);
          e.preventDefault();
          $('.' + gt + '-selector', '.' + gt + '-selectors-type').removeClass("selected");
          self.addClass("selected");
          settings.config_activate = false;
          settings.active_tag = self.text();
          $(obj)[gt]("destroy")[gt](settings);
        });
      });
  },

  methods = {
    init : function(f, options) {
      f = null;
      return this.each(function() {
        var self = $(this), settings = $.extend({}, $.fn[gt].defaults, options);
        self.bind(eventName, { 'settings' : settings }, tag_selected);
        if(settings.config_activate) { build_initializer(self, settings); }
        preloader(self, settings);
      });
    },
    remove_all : function() {
      return this.each(function() {
//TODO: unwrap added spans rather than strip all HTML
        $(this).html($(this).text());
      });
    },
    destroy : function() {
      return this.unbind(eventName);
    }
  };

  $.fn[gt] = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === "function" || !method) {
      return methods.init.apply(this, arguments);
    } else if (typeof method === "object") {
      return methods.init.apply(this, [null, method]);
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery ' + gt );
    }
  };

  $.fn[gt].defaults = {
    'active_group' : 'journal',
    'active_tag'   : 'author',
    'multitag'      : true,
    'tags'          : {},
//TODO: permit user-supplied tags
    'base_styles'  : {
      'author'      : { 'background-color' : '#8dd3c7' },
      'booktitle'   : { 'background-color' : '#ffa1ff' },
      'container'   : { 'background-color' : '#c8c8c8' },
      'date'        : { 'background-color' : '#ffffb3' },
      'doi'         : { 'background-color' : '#79fc72' },
      'edition'     : { 'background-color' : '#72f3fc' },
      'editor'      : { 'background-color' : '#7284fc', 'color' : 'white' },
      'institution' : { 'background-color' : '#ffabab' },
      'isbn'        : { 'background-color' : '#d19a41', 'color' : 'white' },
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
    'config_ele'      : '#' + gt + '-initializer',
    'config_activate' : true,

    //Callbacks
    'onActivate'        : function(obj, data) { obj = null; data = null; },
    'beforeTagged'      : function(obj) { obj = null; },
    'onTagged'          : function(obj, data) { obj = null; data = null; },
    'onMultitagWarning' : function() { alert('You already used that tag. Please choose another.'); },
    'onOverlapWarning'  : function() { alert('Your selection overlapped with a previously created tag. Please try again.'); }
  };

}(jQuery, 'grabtag'));