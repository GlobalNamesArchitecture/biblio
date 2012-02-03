/**
 * jQuery GrabTag
 *
 * A tool to highlight and tag parts of text
 * 
 * Version 0.5
 * January 22, 2012
 *
 * Copyright (c) 2012 David P. Shorthouse
 * Licensed under the MIT license.
 * http://creativecommons.org/licenses/MIT/
 **/
/*global $, jQuery, window, document, alert, Range */

(function($, gt, gtr){

  "use strict";

  var GT              = {},
      eventName       = "mouseup." + gt,
      eventNameResize = "mouseup." + gtr,
      sample_styles   =  [
        { 'background-color' : '#8dd3c7' },
        { 'background-color' : '#ffa1ff' },
        { 'background-color' : '#ffffb3' },
        { 'background-color' : '#79fc72' },
        { 'background-color' : '#72f3fc' },
        { 'background-color' : '#7284fc', 'color' : '#fff' },
        { 'background-color' : '#ffabab' },
        { 'background-color' : '#d19a41', 'color' : '#fff' },
        { 'background-color' : '#fb8072' },
        { 'background-color' : '#948669', 'color' : '#fff' },
        { 'background-color' : '#fdb562' },
        { 'background-color' : '#000', 'color' : '#fff' },
        { 'background-color' : '#bfbada' },
        { 'background-color' : '#80b1d3' },
        { 'background-color' : '#c8c8c8' }
      ];

  GT.get_style = function(obj) {
    return JSON.stringify(obj).replace(/[{}"]/g, "").replace(",", ";");
  };

  GT.convert_markup = function(obj) {
    var snippet = "",
        result  = $(obj).clone(),
        tag     = "";

    snippet = $('[data-' + gt + ']', result);
    snippet.each(function() {
      tag = $(this).attr("data-" + gt);
      $(this).prev(".grabtag-resizer").remove().end()
             .next(".grabtag-resizer").remove().end()
             .wrap('<' + tag + '>' + $(this).text() + '</' + tag + '>').remove();
    });
    return result.html();
  };

  GT.clear_selections = function() {
    var sel;

    if(document.selection && document.selection.empty){
      document.selection.empty() ;
    } else if(window.getSelection) {
      sel = window.getSelection();
    } else if(document.getSelection) {
      sel = document.getSelection();
    }
    if(sel && sel.removeAllRanges) { sel.removeAllRanges(); }
  };

  GT.build_resizer = function(type) {
    return '<span class="' + gt + '-resizer ' + gt + '-resizer-' + type + '"></span>';
  };

  GT.get_selections = function() {
    var sel;

    if(window.getSelection) {
      sel = window.getSelection();
    } else if (document.getSelection) {
      sel = document.getSelection();
    } else if(document.selection) {
      sel = document.selection.createRange();
    }
    return sel;
  };

  GT.build_selector = function(title, innerContent, style, selector) {
    var classes = gt + '-selector ' + gt + '-tag',
        output  = "";

    innerContent = innerContent || "";
    output = '<span class="' + classes + '" style="' + style + '" title="' + title + '" data-' + gt + '="' + title + '">' + innerContent + '</span>';
    if(selector) { output = '<li>' + output + '</li>'; }
    return output;
  };

  GT.range_intersects = function(range, node) {
    var nodeRange = document.createRange();

    try {
      nodeRange.selectNode(node);
    } catch(error) {
      nodeRange.selectNodeContents(node);
    }

  return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) === -1 &&
         range.compareBoundaryPoints(Range.START_TO_END, nodeRange) === 1;
  };

  GT.range_intersects_tags = function(range, obj) {
    var self       = this,
        intersects = false;

    $('.' + gt + '-tag', $(obj)).each(function() {
      if(self.range_intersects(range, this)) {
        intersects = true;
        return;
      }
    });
    return intersects;
  };

  GT.range_intersects_tag = function(range, obj, tag) {
    var self       = this,
        intersects = false;

    $('.' + gt + '-tag', $(obj)).not($(tag)).each(function() {
      if(self.range_intersects(range, this)) {
        intersects = true;
        return;
      }
    });
    return intersects;
  };

  GT.add_resizers = function(obj, settings, newNode) {
    var self      = this,
        resizer_w = self.build_resizer('w'),
        resizer_e = self.build_resizer('e');

    if($(newNode).children('.' + gt + '-resizer').length === 0) {
      $(newNode).prepend(resizer_w).append(resizer_e);
    }

    $('.' + gt + '-resizer').mousedown(function() {
      var _self      = $(this),
          tag        = obj[0].children[$(this).parent().index()],
          tag_type   = $(tag).attr("data-" + gt);

      self.clear_selections();
      $(obj)[gt]("destroy");

      $(obj).unbind(eventNameResize).bind(eventNameResize, function() {
        var sel        = self.get_selections(),
            range      = sel.getRangeAt(0),
            intersects = self.range_intersects(range, tag.childNodes[1]),
            new_range  = document.createRange(),
            residual   = range.cloneRange(),
            offset     = range.toString().length,
            contents   = "";

        if(self.range_intersects_tag(range, $(obj), $(tag))) {
          self.clear_selections();
          $(this).unbind(eventNameResize).bind(eventName, { 'settings' : settings }, self.tag_selected);
          settings.onOverlapWarning.call();
          return;
        }

        try {
          if(_self.hasClass(gt + "-resizer-e")) {
            if(intersects) {
              new_range.setStart(tag.childNodes[1], 0);
              new_range.setEnd(tag.childNodes[1], tag.childNodes[1].length-offset);
            } else {
              new_range.setStart(tag.childNodes[1], 0);
              new_range.setEnd(tag.nextSibling, offset);
            }
          } else if(_self.hasClass(gt + "-resizer-w")) {
            if(intersects) {
              new_range.setStart(tag.childNodes[1], offset);
              new_range.setEnd(tag, 2);
            } else {
              new_range.setStart(tag.previousSibling, tag.previousSibling.length-offset);
              new_range.setEnd(tag, 2);
            }
          }
          self.clear_selections();
          sel.addRange(new_range);
          contents = new_range.extractContents().textContent;
          newNode = $(self.build_selector(tag_type, contents, $(tag).attr("style")));
          if(intersects && _self.hasClass(gt + "-resizer-e")) { $(tag).after(residual.toString()); }
          if(intersects && _self.hasClass(gt + "-resizer-w")) { $(tag).before(residual.toString()); }
          $(tag).before(newNode).remove();
          self.add_resizers($(this), settings, newNode);
          self.context_menu($(this), settings, newNode);
          obj[0].normalize();
          settings.onTag.call(this, $(this), { "tag" : { "type" : tag_type, "value" : contents }, "content" : self.convert_markup(this) });
        } catch(error) {
          self.clear_selections();
          $(this).unbind(eventNameResize).bind(eventName, { 'settings' : settings }, self.tag_selected);
          settings.onOverlapWarning.call();
        }

        self.clear_selections();
        $(this).unbind(eventNameResize).bind(eventName, { 'settings' : settings }, self.tag_selected);
      });

    });
  };

  GT.context_menu = function(obj, settings, tag) {
    var self      = this,
        tag_type  = "",
        tag_value = "",
        menu      = {},
        bound     = false;

    $(tag).mousedown(function(e) {
      tag_type  = $(this).attr("data-" + gt);
      tag_value = $(this).text();

      $.each($(this).data('events'), function() {
        $.each(this, function(i,event) {
          i = null;
          if(event.type === "contextmenu") {
            bound = true;
            return;
          }
        });
      });

      if (e.which === 3 && $.fn.contextMenu && !bound) {
        menu = [{
          'Remove':{
            onclick:function(menuItem,menu) {
              var content = $(tag).find('.' + gt + '-resizer').remove().end().html();

              menuItem = null; menu = null;
              $(tag).before(content).unbind("contextmenu").remove();
              settings.onTagRemove.call(this, $(this), { "tag" : { "type" : tag_type, "value" : tag_value }, "content" : self.convert_markup($(obj)) });
            }
          }
        }];
        $(this).contextMenu(menu, { 'shadow' : false });
      }
    });
  };

  GT.preloader = function(obj, selectors, settings) {
    var self    = this,
        tags    = {},
        snippet = "";

    $.each(selectors, function(index0, value0) {
      if($.isArray(value0)) {
        $.each(value0, function(index1, value1) {
          index1 = null;
          $.each(value1, function(index2, value2) {
            tags[index2] = value2;
          });
        });
      } else {
        tags[index0] = value0;
      }
    });

    $.each(tags, function(index, value) {
      snippet = $('[data-' + gt + '=' + index + ']', obj);
      if(snippet.length > 1 && !settings.multitag) {
        $(snippet[0]).addClass(gt + '-selector ' + gt + '-tag').attr('title', index).attr('style', self.get_style(value));
        self.add_resizers($(obj), settings, $(snippet[0]));
        self.context_menu($(obj), settings, $(snippet[0]));
      } else {
        snippet.each(function() {
          $(this).addClass(gt + '-selector ' + gt + '-tag').attr('title', index).attr('style', self.get_style(value));
          self.add_resizers($(obj), settings, $(this));
          self.context_menu($(obj), settings, $(this));
        });
      }
    });

    settings.onActivate.call(this, obj, { "content" : self.convert_markup(obj) });
  };

  GT.tag_selected = function(e) {
    var self       = GT,
        sel        = self.get_selections(),
        range      = sel.getRangeAt(0),
        newNode    = "",
        settings   = e.data.settings,
        selected   = '.' + gt + '-tag[data-' + gt + '=' + settings.active_tag + ']';

    if(!settings.multitag && $(selected, $(this)).length === 1) {
      self.clear_selections();
      settings.onMultitagWarning.call();
      return;
    }

    if($.trim(sel) !== "") {
      settings.beforeTag.call(this, $(this));
      newNode = $(self.build_selector(settings.active_tag, settings.active_tag, $(selected).attr("style"), false));
      try {
        if(self.range_intersects_tags(range, $(this))) {
          self.clear_selections();
          settings.onOverlapWarning.call();
          return;
        } else {
          self.clear_selections();
          range.surroundContents(newNode[0]);
          self.add_resizers($(this), settings, newNode);
          self.context_menu($(this), settings, newNode);
          settings.onTag.call(this, $(this), { "tag" : { "type" : settings.active_tag, "value" : range.toString() }, "content" : self.convert_markup(this) });
        }
      } catch(error) {
        self.clear_selections();
        settings.onOverlapWarning.call();
        return;
      }
    }

  };

//TODO: counts & default color selections get a little wonky when there are groups
  GT.build_initializer = function(obj, settings) {
    var self      = this,
        counter   = 0,
        content   = "",
        button    = "",
        selectors = {},
        selector  = "",
        tag_obj   = {},
        selected  = "";

    $.each(settings.tags, function(index0, value0) {
      if(typeof value0 === "object") {
        $.each(value0, function(index1, value1) {
          if(isNaN(index1)) {
            selectors[index1] = value1;
          } else {
            selectors[index0] = selectors[index0] || [];
            if(typeof value1 === "object") {
              $.each(value1, function(index2, value2) {
                tag_obj = {};
                tag_obj[index2] = value2;
                selectors[index0].push(tag_obj);
              });
            } else {
              tag_obj = {};
              tag_obj[value1] = sample_styles[counter] || sample_styles[14];
              selectors[index0].push(tag_obj);
            }
          }
          counter += 1;
        });
      } else {
        selectors[value0] = sample_styles[counter] || sample_styles[14];
        counter += 1;
      }
    });

    $.each(selectors, function(index, value) {
      index = null;
      if($.isArray(value)) {
        content = '<div class="' + gt + '-selectors-buttons"><ul></ul></div>';
        return;
      }
    });

    $(settings.config_ele).append(content);

    if($('.' + gt + '-selectors-buttons', settings.config_ele).length > 0) {
      $.each(selectors, function(index0, value0) {
        $(settings.config_ele).append('<div class="' + gt + '-selectors-type ' + index0 + '"><ul></ul></div>');
        selected = (index0 === settings.active_group) ?  " selected" : "";
        button = '<li><a href="#" class="' + gt + '-selectors-button ' + index0 + selected + '">' + index0 + '</a></li>';
        $('.' + gt + '-selectors-buttons ul').append(button);
        $.each(value0, function() {
          $.each(this, function(index1, value1) {
            selector = self.build_selector(index1, index1, self.get_style(value1), true);
            $('.' + gt + '-selectors-type.' + index0 + ' ul').append(selector);
          });
        });
      });
    } else {
      $(settings.config_ele).append('<div class="' + gt + '-selectors-type"><ul></ul></div>');
      $.each(selectors, function(index, value) {
        selector = self.build_selector(index, index, self.get_style(value), true);
        $('.' + gt + '-selectors-type ul', settings.config_ele).append(selector).parent().show();
      });
    }

    $(settings.config_ele).find('.' + gt + '-selectors-button').each(function() {
      $(this).bind('click', function(e) {
        e.preventDefault();
        $('.' + gt + '-selectors-button', settings.config_ele).removeClass("selected");
        $(this).addClass("selected");
        $('.' + gt + '-selectors-type', settings.config_ele).hide();
        $.each($(this).attr("class").split(/\s+/), function() {
          $('.' + gt + '-selectors-type.' + this, settings.config_ele).show();
        });
      });
      if($(this).hasClass(settings.active_group)) { $(this).trigger('click'); }
    }).end().find('.' + gt + '-selector', '.' + gt + '-selectors-type').each(function() {
        if($(this).text() === settings.active_tag) { $(this).addClass('selected'); }
        $(this).click(function(e) {
          var _self = $(this);
          e.preventDefault();
          $('.' + gt + '-selectors-type', settings.config_ele).find('.' + gt + '-selector').removeClass("selected");
          _self.addClass("selected");
          settings.config_activate = false;
          settings.active_tag = _self.text();
          $(obj)[gt]("destroy")[gt](settings);
        });
      });

    return selectors;
  };

  GT.methods = {
    init : function(f, options) {
      f = null;
      return this.each(function() {
        var self = $(this), settings = $.extend({}, $.fn[gt].defaults, options);
        self.bind(eventName, { 'settings' : settings }, GT.tag_selected);
        if(settings.config_activate) { GT.preloader(self, GT.build_initializer(self, settings), settings); }
      });
    },
    remove_all : function() {
      return this.each(function() {
        $('.' + gt + '-tag', $(this)).each(function() {
          $(this).children('.' + gt + '-resizer').remove().end().before($(this).html()).remove();
        });
      });
    },
    destroy : function() {
      return this.unbind(eventName);
    }
  };

  $.fn[gt] = function(method) {
    if (GT.methods[method]) {
      return GT.methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === "function" || !method) {
      return GT.methods.init.apply(this, arguments);
    } else if (typeof method === "object") {
      return GT.methods.init.apply(this, [null, method]);
    } else {
      $.error('Method ' +  method + ' does not exist on jQuery ' + gt);
    }
  };

  $.fn[gt].defaults = {
    'config_ele'        : '#' + gt + '-initializer',
    'config_activate'   : true,
    'multitag'          : true,
    'tags'              : {},
    'active_group'      : '',
    'active_tag'        : '',

    'onActivate'        : function(obj, data) { obj = null; data = null; },
    'beforeTag'         : function(obj) { obj = null; },
    'onTag'             : function(obj, data) { obj = null; data = null; },
    'onTagRemove'       : function(obj, data) { obj = null; data = null; },
    'onMultitagWarning' : function() { alert('This tag has already been used'); },
    'onOverlapWarning'  : function() { alert('This selection overlaps a previous selection'); }
  };

}(jQuery, 'grabtag', 'grabtag-resize'));