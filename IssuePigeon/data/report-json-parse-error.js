// Fix limitations of Scratchpad Pretty Print EcmaScript XX Support
// Replace /\b(const|let)\B/ with "$1 "
// Replace [/\Bof\s*/] With [ of ]
;
'use strict';

let reportError = function (element) {
  var DEBUG = false;
  // window.scrollTo(0, 0);
  for (var oldText of document.body.querySelectorAll('div.report-json-error')) {
    document.body.removeChild(oldText);
  }
  DEBUG && console.log(element);
  var txt = element.textContent || element.value;
  var infoDiv = document.createElement('div');
  infoDiv.className = 'report-json-error';
  infoDiv.style = 'position: fixed; top: 40%; left: 20%; opacity: 0.2;';

  var close = document.createElement('div');
  close.innerHTML = '&times;';
  close.align = 'left';
  var closeOverlay = function (event) {
    document.body.removeChild(event.target.parentElement);
  };
  close.onclick = closeOverlay;
  infoDiv.appendChild(close);
  var info = document.createElement('textarea');
  info.style = 'border: solid limegreen 0.2em; background: white; resize: both;';
  info.readOnly = true;
  info.addEventListener('dblclick', function (e) {
    // e.preventDefault();
    // e.stopPropagation();
    element.removeChild(infoDiv);
  }, false);
  info.addEventListener('touchstart', function (e) {
    // e.preventDefault();
    // e.stopPropagation();
    if (e.targetTouches.length > 1) {
      element.removeChild(infoDiv);
    }
  }, false);
  infoDiv.appendChild(info);
  document.body.appendChild(infoDiv);
  DEBUG && console.log(infoDiv);
  infoDiv.scrollIntoView();
  info.addEventListener('blur', function (e) {
    // e.preventDefault();
    // e.stopPropagation();
    infoDiv.style.transition = '';
    infoDiv.style.opacity = 0.2;
  }, false);
  info.addEventListener('focus', function (e) {
    e.preventDefault();
    e.stopPropagation();
    infoDiv.style.left = infoDiv.offsetLeft + 'px';
    infoDiv.style.top = infoDiv.offsetTop + 'px';
    // infoDiv.style.position = 'absolute';
    infoDiv.style.transition = '';
    infoDiv.style.opacity = 0.9;
  }, false);
  // info.addEventListener('click', function (e) {
  //   e.stopPropagation();
  // });
  true && info.addEventListener('mousemove', function (e) {
    if (e.buttons == 1) {
      // e.preventDefault();
      e.stopPropagation();
      infoDiv.style.left = (e.clientX - (((e.clientX - infoDiv.offsetLeft) > infoDiv.offsetWidth * 0.5) ? infoDiv.offsetWidth * 1 : infoDiv.offsetWidth * 0)) + 'px';
      infoDiv.style.top = (e.clientY - (((e.clientY - infoDiv.offsetTop) > infoDiv.offsetHeight * 0.5) ? infoDiv.offsetHeight * 1 : infoDiv.offsetHeight * 0)) + 'px';
    }
  }, false);
  info.addEventListener('touchmove', function (e) {
    var touchY = e.touches[e.touches.length - 1].clientY;
    var touchX = e.touches[e.touches.length - 1].clientX;
    if ((touchY - infoDiv.offsetTop) < infoDiv.offsetHeight * 0.9 || (touchX - infoDiv.offsetLeft) < infoDiv.offsetWidth * 0.9) {
      e.stopPropagation();
      // e.preventDefault();
      infoDiv.style.left = (touchX - (((touchX - infoDiv.offsetLeft) > infoDiv.offsetWidth * 0.5) ? infoDiv.offsetWidth * 0.1 : infoDiv.offsetWidth * 0.9)) + 'px';
      infoDiv.style.top = (touchY - (((touchY - infoDiv.offsetTop) > infoDiv.offsetHeight * 0.5) ? infoDiv.offsetHeight * 0.1 : infoDiv.offsetHeight * 0.9)) + 'px';
    }
  }, false);
  try {
    var data = JSON.parse(txt);
    // info.style.opacity = 0.9;
    info.value = 'JSON data (' + txt.length + ' characters) parsed without errors';
    var div = document.createElement('div');
    var download = document.createElement('a');
    var blob = new window.Blob([JSON.stringify(data, null, 2)], {
      type: 'text/plain; charset=utf-8'
    });
    download.href = window.URL.createObjectURL(blob);
    download.download = 'report-json-parse-error-' + (data.total_rows || data.length || typeof d == 'object' && Object.keys(d).length) + '-' + Date.now() + '.txt';
    download.textContent = 'Download exported data';
    div.appendChild(download);
    infoDiv.appendChild(div);
    return false;
  } catch (e) {
    var matches = e.message.match(/\bline (\d+) column (\d+)\b/);
    var line = matches[1];
    var column = matches[2];
    var charOffset = txt.split(/\n/).slice(0, line - 1).join('\n').length + Number.parseInt(column);
    var lineText = txt.split(/\n/) [line - 1];
    var sel = window.getSelection();
    sel.removeAllRanges();
    info.value = e.message + '\nat ';
    info.value += (new Number(charOffset / txt.length * 100)).toFixed(1);
    info.value += '% of data\ncharOffset at line ' + line + ' column ';
    info.value += column + ' is ' + charOffset + '\ncharCodeAt(' + charOffset;
    info.value += ') = ' + txt.charCodeAt(charOffset) + '\ncharAt(';
    info.value += charOffset + ') = ' + JSON.stringify(txt.charAt(charOffset));
    if (txt.length > charOffset) {
      if (element.textContent) {
        var r = document.createRange();
        if (element.firstChild.nodeName != "#text") {
          info.value = 'element seems to have non-text children, not the expected text node with JSON data.\n\n' + info.value;
          return;
        }
        r.setStart(element.firstChild, (txt.length > charOffset) ? (charOffset - 1)  : (txt.length - 1));
        r.setEnd(element.firstChild, (txt.length > (charOffset + 1)) ? charOffset + 2 : ((txt.length > charOffset) ? charOffset : txt.length));
        sel.addRange(r);
        sel.collapsed = false;
        var cbr = r.getBoundingClientRect();
        window.scrollTo(cbr.x, cbr.y);
        // info.style = 'position: absolute; opacity: 0.9; top: ' +
        // cbr.bottom + 'px; left: ' + cbr.right + 'px; border: solid red 0.2em; background: white;';
      }
      if (element.value) {
        element.selectionStart = (txt.length > charOffset) ? (charOffset - 1)  : (txt.length - 1);
        element.selectionEnd = (txt.length > (charOffset + 1)) ? charOffset + 2 : ((txt.length > charOffset) ? charOffset : txt.length);
      }
    } else {
      info.value = 'JSON error offset is beyond first ' + element.nodeName + ' node.\n' + info.value;
    }
    info.style.borderColor = 'red';
    info.style.transition = 'opacity 3s 1s';
    info.style.opacity = 0.9;
    info.rows = info.value.split(/\n/).length;
    info.cols = Math.max.apply(null, info.value.split(/\n/).map(function (line) {
      return line.length;
    }));
    return true;
  }
};
// parent.window.reportError = reportError;
// console.log(typeof parent.window.reportError);
// if (typeof document !== 'undefined') {
//   // reportError(document.activeElement || document.body.firstElementChild);
//   document.reportError = reportError;
// } else {
// }
