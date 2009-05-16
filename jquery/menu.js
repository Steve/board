
$(function() {

//var demoMenu = new demo();
//window.demoMenu = demoMenu;
$.fn.draggable.defaults = {
    target: false
};

$('.container').droppable({
    cls: {active: 'containeractive', over: 'containerover'},
    tolerance: 'fit'
});
$('.drag').draggable({cls: {active: 'draggable'}})
             .resizable({handles:'all', skipEnable: true});
$('#nested').find('.drag').draggable({
    target: $('#nested').find('.container'),
    beforeDrop: function(eData) {
        if (eData.droppable[0]==eData.self.parent()[0]) return;
        eData.droppable.append(eData.self);
    }
});
$('#scroll').find('.drag').draggable({
    target: $('#scroll').find('.container'),
    beforeDrop: function(eData) {
        if (eData.droppable[0]==eData.self.parent()[0]) return;
        eData.droppable.find('p').eq(0).after(eData.self);
    }
});

var table = $('.resizetable');
var td = table.find('td');
var _w = 0, _h = 0;
table.find('tr').each(function(trInx) {
    $(this).find('td').each(function(tdInx){
        var col = $(this);
        var handles = [];
        if (trInx != 0) handles.push('n');
        if (trInx != 2) handles.push('s');
        if (tdInx != 0) handles.push('w');
        if (tdInx != 2) handles.push('e');
        col.resizable({
            skipEnable: true,
            handles: handles.join(','),
            size: 5,
            data: {row: trInx, col: tdInx},
            cls: {handle: 'tablehandle'}
        });
        col.data('resizable')
            .localBind('start', function(eData) {
                var d = $(this).data('dynamic');
                _w = d.cssSize.width;
                _h = d.cssSize.height;
                td.each(function(){
                    if (this==eData.self[0]) return true;
                    $(this).data('resizable').toggleHandles('off');
                });
            }, this)
            .localBind('sizeChange', function(eData) {
                var handle = eData.handle, pos = eData.data, o = eData.self, e = eData.event, d = $(this).data('dynamic');;
                var ydiff = d.cssSize.height - _h;
                var xdiff = d.cssSize.width - _w;
                _w = d.cssSize.width;
                _h = d.cssSize.height;
                var styleProp = /n|s/.test(handle) ? 'height': 'width';

                var alsoPos = {
                    row: /n|s/.test(handle) ? 'n'==handle ? pos.row-1 : pos.row+1 : pos.row,
                    col: /w|e/.test(handle) ? 'w'==handle ? pos.col-1 : pos.col+1 : pos.col
                };

                table.find('tr').each(function(i){
                    if (/n|s/.test(handle) && i != pos.row && i!=alsoPos.row) return true;
                    $(this).find('td').each(function(j){
                        if (/w|e/.test(handle) && j != pos.col && j!=alsoPos.col) return true;
                        if (this==o[0]) return true;
                        if (i == alsoPos.row && j == alsoPos.col) {
                            if (!this.style[styleProp]) return true;
                            var curValue = parseInt(this.style[styleProp], 10);
                            curValue -= /n|s/.test(e.resizeHandle) ? ydiff : xdiff;
                            if (curValue <= 1) curValue=1;
                            this.style[styleProp] = curValue+'px';
                        } else this.style[styleProp] = '';
                    })
                });
            }, this)
            .localBind('end', function(eData) {
                eData.self.data('resizable').updateHandles();
                td.each(function(){
                    if (this==eData.self[0]) return true;
                    $(this).data('resizable').toggleHandles('on');
                });
            }, this)
            .localEvents=true;
    });
});

table.resizable({
    skipEnable: true,
    size:5,
    outside:5,
    cls: {handle: 'tablehandle'},
    beforeStart: function() {
        td.each(function(){
            $(this).data('resizable').toggleHandles('off');
        });
    },
    end: function() {
        td.each(function(){
            $(this).data('resizable').toggleHandles('on');
        });
    }
});

var log = $('#log');
var writeLog = function(name) {
    log.append(name+'<br>');
    log[0].scrollTop += 20;
};
window.clearLog = function() {
    log.html('');
};

$('textarea').resizable({skipEnable: true, outside: 10, size: 10, cls: {handle: 'tablehandle'}});
$('#callbacks').find('.drag').draggable({
    skipEnable: true,
    beforeStart: function() { writeLog('beforeStart'); },
    start: function(e) { writeLog('start'); },
    drag: function() { writeLog('drag'); },
    beforeEnd: function() { writeLog('beforeEnd'); },
    end: function() { writeLog('end'); },
    enabled: function() { writeLog('enabled'); },
    disabled: function() { writeLog('disabled'); },
    onSnap: function() { writeLog('snap'); },
    onSnapRelease: function() { writeLog('snapRelease'); },
    onScroll: function() { writeLog('scroll'); }
}).resizable({
    skipEnable: true,
    beforeStart: function() { writeLog('beforeStart'); },
    start: function() { writeLog('start'); },
    sizeChange: function() { writeLog('sizeChange'); },
    beforeEnd: function() { writeLog('beforeEnd'); },
    end: function() { writeLog('end'); },
    enabled: function() { writeLog('enabled'); },
    disabled: function() { writeLog('disabled'); },
    onSnap: function() { writeLog('snap'); },
    onSnapRelease: function() { writeLog('snapRelease'); }
});

$('#misc').find('.absolute').draggable({handle: '.draghandle'}).resizable({skipEnable: true, handles: 'se', se: '.resizehandle'});

$('.sortlist').eq(0).find('li').draggable({
    container: 'parent',
    placeholder: true,
    target: $('.sortlist').eq(0).find('li'),
    cls: {placeholder: 'liholder'},
    targetOptions: {
        cls: { over: 'liover' },
        tolerance: 'pointer',
        group: 'li',
        drop: function(e) {
            e.draggable.insertBefore(e.self);
        }
    }
});

$('.sortlist').eq(1).find('li').draggable({
    container: 'parent',
    placeholder: true,
    target: $('.sortlist').eq(1).find('li'),
    cls: {placeholder: 'liholder'},
    targetOptions: {
        tolerance: 'pointer',
        group: 'li',
        over: function(e) {
            if (e.placeholder.next().get(0) == e.self[0]) return true;
            e.placeholder.insertBefore(e.self);
        },
        drop: function(e) {
            if (e.draggable.next().get(0) == e.self[0]) return true;
            e.draggable.insertBefore(e.self);
        }
    }
});

var drg = $('.dnmc-draggable').filter(function(){ return !$(this).hasClass('dnmc-resize'); })
    .add($('#misc').find('.absolute'));
var cntmnt = $('#nested').find('.drag');
var scrl = $('#scroll').find('.drag');
var drpbl = $('.dnmc-droppable');

// demoMenu.add('draggable', {
//     name: 'Draggable',
//     description: '',
//     renderTo: '#draggable',
//     docURL: 'dynamic.xml',
//     tests: [{
//             //////// ENABLE / DISABLE
//             name: 'Enable/Disable',
//             elems: drg,
//             presets: [{
//                 name: 'Enabled'
//                 }, {
//                 name: 'Disabled'
//             }],
//             handler: function(key, elems) {
//                 elems.draggable(key==0?true:false);
//             }
//         }, {
//             /////////// CONTAINMENT
//             name: 'Containment',
//             elems: cntmnt,
//             docref: 'container, bound',
//             id: 'containment',
//             hidden: true,
//             liClass: 'specificOptions',
//             presets: [{
//                     name: 'Disabled',
//                     options: {container: false, bound: false}
//                 }, {
//                     name: 'Offset parent (container: true)',
//                     options: {container: true, bound: false}
//                 }, {
//                     name: 'Parent (container: "parent")',
//                     options: {container: 'parent', bound: false}
//             }]
//         }, {
//             /////////// SCROLLING
//             name: 'Scroll',
//             elems: scrl,
//             docref: 'scroll, scrollSensitivity, scrollStep, scrollOutside',
//             id: 'scroll',
//             hidden: true,
//             liClass: 'specificOptions',
//             before: function(elems, inx) {
//                 $('#scroll').find('.container')[inx!=1?'removeClass':'addClass']('scrollable');
//                 if (inx==3) $('#scroll').find('.container').eq(2).addClass('scrollable');
//             },
//             presets: [{
//                     name: 'Disabled',
//                     options: {scroll: false, scrollOutside: false, scrollSensitivity: 50}
//                 }, {
//                     name: 'Parent (scroll: true)',
//                     options: {scroll: true, scrollOutside: false, scrollSensitivity: 50}
//                 }, {
//                     name: 'Body',
//                     options: {scroll: $('body'), scrollOutside: false, scrollSensitivity: 50}
//                 }, {
//                     name: 'Custom element - absolute container (scroll outside)',
//                     options: {scroll: $('#scroll').find('.container').eq(2), scrollOutside: true, scrollSensitivity: 50}
//             }]
//         }, {
//             //////// HELPER
//             name: 'Helper',
//             elems: drg,
//             docref: 'helper',
//             presets: [{
//                     name: 'No helper',
//                     options: { cls: {helper: false}, destroyHelper: true, helper: false}
//                 }, {
//                     name: 'Clone',
//                     options: { cls: {helper: false}, destroyHelper: true, helper: true}
//                 }, {
//                     name: 'Helper',
//                     options: { cls: {helper: 'drghelper'}, destroyHelper: true, helper: true}
//                 }, {
//                     name: 'Custom element',
//                     options: { cls: {helper: false}, destroyHelper: false, helper: '#customhelper'}
//                 }, {
//                     name: 'Custom function',
//                     options: { cls: {helper: false}, destroyHelper: true, helper: function() {
//                             return $('<div class=drgcustom>custom function</div>');
//                         }
//                     }
//             }]
//         }, {
//             ///////// PLACEHOLDER
//             name: 'Placeholder',
//             elems: drg,
//             docref: 'placeholder',
//             presets: [{
//                     name: 'No placeholder',
//                     options: { cls: {placeholder: false}, placeholder: false, destroyHelper: true}
//                 }, {
//                     name: 'Using class',
//                     options: { cls: {placeholder: 'placeholder'}, placeholder: true, destroyHelper: true}
//                 }, {
//                     name: 'Custom element',
//                     options: { cls: {placeholder: false}, placeholder: '#customplaceholder', destroyHelper: false}
//                 }, {
//                     name: 'Custom function',
//                     options: { cls: {placeholder: false}, destroyHelper: true, placeholder: function() {
//                         return $('<div class=drgcustom>custom function</div>');
//                     }}
//             }]
//         }, {
//             /////// OPACITY
//             name: 'Opacity',
//             description: 'Applied to the element while dragging, no matter whether you use helper or placeholder or nothing',
//             elems: drg,
//             docref: 'opacity',
//             presets: [{
//                     name: 'Opaque',
//                     options: {opacity: false}
//                 }, {
//                     name: '0,5',
//                     options: {opacity: 0.5}
//             }]
//         }, {
//             /////////// ANIMATION
//             name: 'Animation',
//             description: 'This option works only when you use helper or placeholder + restore',
//             elems: drg,
//             docref: 'animate',
//             presets: [{
//                     name: 'Disabled',
//                     options: {animate: false}
//                 }, {
//                     name: '300 ms',
//                     options: {animate: 300}
//             }]
//         }, {
//             /////////// RESTORE
//             name: 'Restore',
//             description: '',
//             elems: drg,
//             docref: 'restore',
//             presets: [{
//                     name: 'Disabled',
//                     options: {restore: false}
//                 }, {
//                     name: 'Enabled',
//                     options: {restore: true}
//             }]
//         }, {
//             /////////// EASING
//             name: 'Easing',
//             description: 'This option works only when animation is enabled',
//             elems: drg,
//             docref: 'easing',
//             presets: [{
//                     name: 'Disabled',
//                     options: {easing: false}
//                 }, {
//                     name: 'easeOutBack',
//                     options: {easing: 'easeOutBack'}
//                 }, {
//                     name: 'easeInQuad',
//                     options: {easing: 'easeInQuad'}
//             }]
//         }, {
//             /////////// AXIS
//             name: 'Axis',
//             elems: drg,
//             docref: 'axis',
//             presets: [{
//                     name: 'Disabled',
//                     options: {axis: false}
//                 }, {
//                     name: 'x',
//                     options: {axis: 'x'}
//                 }, {
//                     name: 'y',
//                     options: {axis: 'y'}
//             }]
//         }, {
//             /////////// CURSOR
//             name: 'Cursor position',
//             elems: drg,
//             docref: 'cursorAt, preserveCursor',
//             presets: [{
//                     name: 'At click position',
//                     options: {cursorAt: false, preserveCursor: false}
//                 }, {
//                     name: 'left: 0, top: 0',
//                     options: {cursorAt: {left: 0, top: 0}, preserveCursor: true}
//                 }, {
//                     name: 'right: 5, bottom: 5',
//                     options: {cursorAt: {right: 5, bottom: 5}, preserveCursor: true}
//             }]
//         }, {
//             /////////// DELAY
//             name: 'Delay',
//             elems: drg,
//             docref: 'delay',
//             presets: [{
//                     name: 'No delay',
//                     options: {delay: false}
//                 }, {
//                     name: '500 ms',
//                     options: {delay: 500}
//             }]
//         }, {
//             /////////// DISTANCE
//             name: 'Distance',
//             elems: drg,
//             docref: 'distance',
//             presets: [{
//                     name: 'No distance',
//                     options: {distance: false}
//                 }, {
//                     name: '50px',
//                     options: {distance: 50}
//             }]
//         }, {
//             /////////// GRID
//             name: 'Grid',
//             elems: drg,
//             docref: 'grid,gridStart',
//             presets: [{
//                     name: 'No grid',
//                     options: {grid: false, gridStart: false}
//                 }, {
//                     name: '100px, starting from current position',
//                     options: {grid: 100, gridStart: false}
//                 }, {
//                     name: '{x: 100, y: 20}, starting from current position',
//                     options: {grid: {x: 100, y: 20}, gridStart: false}
//                 }, {
//                     name: '50px, starting from 0, 0',
//                     options: {grid: 50, gridStart: {x: 0, y: 0}}
//             }]
//         }, {
//             /////////// SNAP
//             name: 'Snapping',
//             elems: drg,
//             docref: 'snap',
//             presets: [{
//                     name: 'No snapping',
//                     options: {snap: false, cls: {snapTarget: false, snapped: false}}
//                 }, {
//                     name: 'Automatic (snap other draggables)',
//                     options: {snap: true, cls: {snapTarget: false, snapped: false}}
//                 }, {
//                     name: 'Automatic (with classes)',
//                     options: {snap: true, cls: {snapTarget: 'snapTarget', snapped: 'snapped'}}
//                 }, {
//                     name: 'Custom element (menu)',
//                     options: {snap: '.menu', cls: {snapTarget: false, snapped: false}}
//             }]
//         }, {
//             /////////// SNAP 2
//             name: 'Snap modes',
//             elems: drg,
//             docref: 'snapTolerance,snapMode',
//             presets: [{
//                     name: 'Default',
//                     options: {snapTolerance: 20, snapMode: 'both'}
//                 }, {
//                     name: '20px inner',
//                     options: {snapTolerance: 20, snapMode: 'inner'}
//                 }, {
//                     name: '50px outer',
//                     options: {snapTolerance: 50, snapMode: 'outer'}
//             }]
//         }, {
//             /////////// KEYBOARD
//             name: 'Keyboard',
//             description: 'This option requires module restart. Set this option only while draggable is disabled (or when initializing). '
//                             +'In this demo restart will happen automatically.',
//             elems: drg,
//             docref: 'keyboard,keyStep,keyTime,keyboardOnly',
//             before: function(elems) {elems.draggable(false);},
//             after: function(elems) {elems.draggable(true);},
//             presets: [{
//                     name: 'Disabled',
//                     options: {keyboard: false, keyStep: 5, keyTime: 100, keyboardOnly: false}
//                 }, {
//                     name: 'Enabled',
//                     options: {keyboard: true, keyStep: 5, keyTime: 100, keyboardOnly: false}
//                 }, {
//                     name: 'Keyboard only',
//                     options: {keyboard: true, keyStep: 5, keyTime: 100, keyboardOnly: true}
//                 }, {
//                     name: 'keyStep: 40px, keyTime: 200ms',
//                     options: {keyboard: true, keyStep: 40, keyTime: 200, keyboardOnly: false}
//             }]
//         }, {
//             /////////// WITHKEY
//             name: 'Functional modifiers',
//             description: 'Use this function (withKey option) when you want to differentiate behavior depending on key pressed',
//             elems: drg,
//             docref: 'withKey',
//             id: 'withkey',
//             presets: [{
//                     name: 'Disabled',
//                     options: {withKey: false}
//                 }, {
//                     name: 'Drag: none',
//                     options: {withKey:  {drag: 'none'}}
//                 }, {
//                     name: 'Drag: none|ctrl',
//                     options: {withKey:  {drag: 'none|ctrl'}}
//                 }, {
//                     name: 'Helper: ctrl, Placeholder: shift',
//                     options: {withKey:  {helper: 'ctrl', placeholder: 'shift'}}
//             }]
//         }, {
//             /////////// STACK
//             name: 'Stack',
//             elems: drg,
//             docref: 'stack',
//             presets: [{
//                     name: 'Disabled',
//                     options: {stack: false, zIndex:1000}
//                 }, {
//                     name: 'Enabled',
//                     options: {stack: true, zIndex: 100}
//             }]
//         }, {
//             /////////// HIDE
//             name: 'Hide',
//             description: 'Hides chosen elements while dragging',
//             elems: drg,
//             docref: 'hide',
//             presets: [{
//                     name: 'Disabled',
//                     options: {hide: false}
//                 }, {
//                     name: 'Hide elements with .static class',
//                     options: {hide: '.static'}
//                 }, {
//                     name: 'Hide menu',
//                     options: {hide: '.menu'}
//             }]
//         }]
// });
// 
// demoMenu.add('resizable', {
//     name: 'Resizable',
//     description: '',
//     renderTo: '#resizable',
//     docURL: 'dynamic.xml',
//     tests: [{
//             //////// ENABLE / DISABLE
//             name: 'Enable/Disable',
//             elems: drg,
//             presets: [{
//                 name: 'Enabled'
//                 }, {
//                 name: 'Disabled'
//             }],
//             handler: function(key, elems) {
//                 elems.resizable(key==0?true:false);
//             }
//         }, {
//             ///// HELPER
//             name: 'Helper',
//             elems: drg,
//             docref: 'helper',
//             id: 'helper',
//             presets: [{
//                     name: 'Disabled',
//                     options: { helper: false, cls: { helper: false, ghost: false }}
//                 }, {
//                     name: 'Ghost',
//                     options: { helper: true, cls: { helper: false, ghost: 'resizeghost'}}
//                 }, {
//                     name: 'Helper',
//                     options: { helper: true, cls: { helper: 'resizehelper', ghost: false}}
//             }]
//         }, {
//             /////////// CONTAINMENT
//             name: 'Containment',
//             elems: cntmnt,
//             docref: 'container, bound',
//             id: 'containment',
//             liClass: 'specificOptions',
//             presets: [{
//                     name: 'Disabled',
//                     options: {container: false, bound: false}
//                 }, {
//                     name: 'Offset parent (container: true)',
//                     options: {container: true, bound: false}
//                 }, {
//                     name: 'Parent (container: "parent")',
//                     options: {container: 'parent', bound: false}
//             }]
//         }, {
//             /////////// SCROLLING
//             name: 'Scroll',
//             elems: scrl,
//             docref: 'scroll, scrollSensitivity, scrollStep',
//             id: 'scroll',
//             hidden: true,
//             liClass: 'specificOptions',
//             before: function(elems, inx) {
//                 $('#scroll').find('.container')[inx!=1?'removeClass':'addClass']('scrollable');
//             },
//             presets: [{
//                     name: 'Disabled',
//                     options: {scroll: false, scrollSensitivity: 50}
//                 }, {
//                     name: 'Parent (scroll: true)',
//                     options: {scroll: true,  scrollSensitivity: 50}
//             }]
//         }, {
//             ///// CLICKNDRAG
//             name: 'Clickndrag',
//             description: 'Its recommended that you disable draggable while using clickdrag, or enable withKey option for draggables.',
//             elems: drg,
//             docref: 'clickndrag',
//             before: function(elems, mode) {
//                 demoMenu.setOption('draggable', 'withkey', mode==0?0:1);
//                 elems.resizable(false);
//             },
//             after: function(elems) {
//                 elems.filter(function(){
//                     return $(this).parents('.examples').eq(0).is(':visible');
//                 }).resizable(true);
//             },
//             presets: [{
//                     name: 'Disabled',
//                     options: { clickndrag: false, withKey: { clickndrag: false} }
//                 }, {
//                     name: 'Enabled (with ctrl)',
//                     options: { clickndrag: true, withKey: { clickndrag: 'ctrl'}}
//             }]
//         }, {
//             ///// WHEEL
//             name: 'Wheel',
//             elems: drg,
//             docref: 'wheel',
//             before: function(elems, mode) { elems.resizable(false); },
//             after: function(elems) {
//                 elems.filter(function(){
//                     return $(this).parents('.examples').eq(0).is(':visible');
//                 }).resizable(true);
//             },
//             presets: [{
//                     name: 'Disabled',
//                     options: { wheel: false }
//                 }, {
//                     name: 'Enabled',
//                     options: { wheel: true }
//             }]
//         }, {
//             ///// CLS
//             name: 'Classes',
//             elems: drg,
//             docref: 'cls',
//             id: 'cls',
//             before: function(elems, mode) { elems.resizable(false); },
//             after: function(elems) {
//                 elems.filter(function(){
//                     return $(this).parents('.examples').eq(0).is(':visible');
//                 }).resizable(true);
//             },
//             presets: [{
//                     name: 'No classes',
//                     options: { cls: {handle: false, active: false, nw: false, ne: false, se: false, sw: false} }
//                 }, {
//                     name: 'Visible handles',
//                     options: { cls: {handle: 'temphandle', active: false, nw: false, ne: false, se: false, sw: false}}
//                 }, {
//                     name: 'Visible rounded handles (FF only)',
//                     options: {
//                         cls: {
//                             handle: 'temphandle',
//                             active: 'elem-rounded',
//                             nw: 'nw-rounded',
//                             ne: 'ne-rounded',
//                             se: 'se-rounded',
//                             sw: 'sw-rounded'
//                         }
//                     }
//             }]
//         }, {
//             /////////// WITHKEY
//             name: 'Functional modifiers',
//             description: 'Use this function (withKey option) when you want to differentiate behavior depending on key pressed',
//             elems: drg,
//             docref: 'withKey',
//             id: 'withkey',
//             presets: [{
//                     name: 'Disabled',
//                     options: {withKey: false }
//                 }, {
//                     name: 'Helper: ctrl',
//                     options: {withKey:  {helper: 'ctrl'}}
//             }]
//         }, {
//             /////////// ANIMATE
//             name: 'Animation',
//             description: 'This option works only if you use helper.',
//             elems: drg,
//             docref: 'animate',
//             presets: [{
//                     name: 'Disabled',
//                     options: {animate: false }
//                 }, {
//                     name: '300ms',
//                     options: {animate: 300}
//             }]
//         }, {
//             /////////// EASING
//             name: 'Easing',
//             description: 'This option works only when animation is enabled',
//             elems: drg,
//             docref: 'easing',
//             presets: [{
//                     name: 'Disabled',
//                     options: {easing: false}
//                 }, {
//                     name: 'easeOutBack',
//                     options: {easing: 'easeOutBack'}
//                 }, {
//                     name: 'easeInQuad',
//                     options: {easing: 'easeInQuad'}
//             }]
//         }, {
//             /////////// RESTORE
//             name: 'Restore',
//             elems: drg,
//             docref: 'restore',
//             presets: [{
//                     name: 'Disabled',
//                     options: {restore: false }
//                 }, {
//                     name: 'Enabled',
//                     options: {restore: true}
//             }]
//         }, {
//             /////////// RATIO, MIN, MAX
//             name: 'Ratio, min, max',
//             elems: drg,
//             docref: 'ratio,min,max',
//             presets: [{
//                     name: 'Disabled',
//                     options: {ratio: false, min: false, max: false}
//                 }, {
//                     name: 'Preserve ratio',
//                     options: {ratio: true, min: false, max: false}
//                 }, {
//                     name: 'Min - 50, Max - 200',
//                     options: {ratio: false, min: 50, max: 200}
//                 }, {
//                     name: 'Ratio: 4:3, min: 50, max:200',
//                     options: {ratio: 4/3, min: 50, max: 200}
//             }]
//         }, {
//             /////// OPACITY
//             name: 'Opacity',
//             description: 'Applied to the element while resizing, no matter whether you use helper or not',
//             elems: drg,
//             docref: 'opacity',
//             presets: [{
//                     name: 'Opaque',
//                     options: {opacity: false}
//                 }, {
//                     name: '0,5',
//                     options: {opacity: 0.5}
//             }]
//         }, {
//             /////////// DELAY
//             name: 'Delay',
//             elems: drg,
//             docref: 'delay',
//             before: function(elems, mode) { elems.resizable(false); },
//             after: function(elems) {
//                 elems.filter(function(){
//                     return $(this).parents('.examples').eq(0).is(':visible');
//                 }).resizable(true);
//             },
//             presets: [{
//                     name: 'No delay',
//                     options: {delay: false}
//                 }, {
//                     name: '500 ms',
//                     options: {delay: 500}
//             }]
//         }, {
//             /////////// DISTANCE
//             name: 'Distance',
//             elems: drg,
//             docref: 'distance',
//             before: function(elems, mode) { elems.resizable(false); },
//             after: function(elems) {
//                 elems.filter(function(){
//                     return $(this).parents('.examples').eq(0).is(':visible');
//                 }).resizable(true);
//             },
//             presets: [{
//                     name: 'No distance',
//                     options: {distance: false}
//                 }, {
//                     name: '50px',
//                     options: {distance: 50}
//             }]
//         }, {
//             /////////// AXIS
//             name: 'Axis',
//             elems: drg,
//             docref: 'axis',
//             before: function(elems, mode) { elems.resizable(false); },
//             after: function(elems) {
//                 elems.filter(function(){
//                     return $(this).parents('.examples').eq(0).is(':visible');
//                 }).resizable(true);
//             },
//             presets: [{
//                     name: 'Disabled',
//                     options: {axis: false}
//                 }, {
//                     name: 'x',
//                     options: {axis: 'x'}
//                 }, {
//                     name: 'y',
//                     options: {axis: 'y'}
//             }]
//         }, {
//             /////////// GRID
//             name: 'Grid',
//             elems: drg,
//             docref: 'grid',
//             presets: [{
//                     name: 'No grid',
//                     options: {grid: false}
//                 }, {
//                     name: '100px',
//                     options: {grid: 100}
//                 }, {
//                     name: '{x: 100, y: 20}',
//                     options: {grid: {x: 100, y: 20}}
//             }]
//         }, {
//             /////////// SNAP
//             name: 'Snap',
//             elems: drg,
//             docref: 'snap',
//             presets: [{
//                     name: 'No snapping',
//                     options: {snap: false}
//                 }, {
//                     name: 'Automatic (other resizables)',
//                     options: {snap: true}
//                 }, {
//                     name: 'Custom element (menu)',
//                     options: {snap: '.menu'}
//             }]
//         }, {
//             /////////// HIDE
//             name: 'Hide',
//             description: 'Auto hide handles',
//             elems: drg,
//             docref: 'hide',
//             before: function(elems, mode) { elems.resizable(false); },
//             after: function(elems) {
//                 elems.filter(function(){
//                     return $(this).parents('.examples').eq(0).is(':visible');
//                 }).resizable(true);
//             },
//             presets: [{
//                     name: 'Disabled',
//                     options: {hide: false}
//                 }, {
//                     name: 'Enabled',
//                     options: {hide: true}
//             }]
//     }]
// });
// 
// 
// 
// demoMenu.add('droppable', {
//     name: 'Droppable',
//     description: '',
//     renderTo: '#droppable',
//     docURL: 'dynamic.xml',
//     tests: [{
//             //////// ENABLE / DISABLE
//             name: 'Enable/Disable',
//             elems: drpbl,
//             id: 'enable',
//             presets: [{
//                 name: 'Enabled'
//                 }, {
//                 name: 'Disabled'
//             }],
//             handler: function(key, elems) {
//                 elems.droppable(key==0?true:false);
//             }
//         }, {
//             ///// HELPER
//             name: 'Accept',
//             elems: drpbl,
//             docref: 'accept',
//             presets: [{
//                     name: 'Enabled (accept all)',
//                     options: { accept: true }
//                 }, {
//                     name: 'Disabled (do not accept any)',
//                     options: { accept: false }
//                 }, {
//                     name: 'Accept only absolute (by selector)',
//                     options: { accept: '.absolute' }
//             }]
//         }, {
//             ///// GREEDY
//             name: 'Greedy',
//             description: 'See nested static droppable in Containment tab',
//             elems: drpbl,
//             docref: 'greedy',
//             presets: [{
//                     name: 'Disabled',
//                     options: { greedy: false }
//                 }, {
//                     name: 'Enabled',
//                     options: { greedy: true }
//             }]
//         }, {
//             ///// TOLERANCE
//             name: 'Tolerance',
//             elems: drpbl,
//             docref: 'tolerance',
//             presets: [{
//                     name: 'Fit (default for this demo)',
//                     options: { tolerance: 'fit' }
//                 }, {
//                     name: 'Pointer',
//                     options: { tolerance: 'pointer' }
//                 }, {
//                     name: 'Intersect',
//                     options: { tolerance: 'intersect' }
//             }]
//     }]
// });


window.loader = (function(){
    var div = $('.loading');
    var span = $('span', div);
    var itv = false;
    var inx = 0;
    return {
        start: function() {
            if (itv) return false;
            div.show().css({
                left: Math.round($(window).width()/2 - div.width()/2),
                top: Math.round($(window).height()/2 - div.height()/2)
            });
            itv = window.setInterval(this.next, 1000);
        },
        next: function() {
            if (inx>0) span.eq(inx-1).fadeOut(800);
            if (inx == span.length) inx=0;
            span.eq(inx).fadeIn(800);
            inx++;
        },
        stop: function() {
            window.clearInterval(itv);
            itv = false;
            inx = 0;
            span.hide();
            div.hide();
        }
    }
})();

//demoMenu.render();
});
