function getfile(type, address) {
    var element = document.createElement(type);
    element.src = address;
    return element;
}

(function loadingBarAnimation() {
    var loadingBarText = document.getElementById('loadingBarText');
    var text = "TG - Fridge Pro";
    var text_ = text + ' ';
    var loading;
    var i = 0;
    var loadtext = setInterval(() => {
        loadingBarText.innerText += text_[i++];
        if (i >= text_.length) {
            i = 0;
            loading = setInterval(() => {
                if (loadingBarText.innerText.endsWith('_')) {
                    loadingBarText.innerText = text_;
                } else {
                    loadingBarText.innerText = text + '_';
                }
                i++;
                if (i > 3) {
                    clearInterval(loading);
                    var loadingBar = document.getElementById('loadingBar');
                    loadingBar.style.cssText = '-webkit-backdrop-filter: blur(0); backdrop-filter: blur(0); background-color: transparent';
                    loadingBarText.style.opacity = '0';
                    setTimeout(() => {
                        loadingBar.style.display = 'none';
                    }, 700);
                }
            }, 300);
            clearInterval(loadtext);
        }
    }, 50);
})();

function enterFridge() {
    var fridgeVideo = document.getElementById('fridgeVideo');
    var fridgeButton = document.getElementById('fridgeButton');
    fridgeButton.style.display = 'none';
    fridgeVideo.play();
    am_enterFridge.back.play();
    am_enterFridge.foodLists.play();
}

function videoRewind(video, callback, startRewind, end = 0, speed = 1) {
    video.pause();
    if (startRewind != undefined) {
        video.currentTime = startRewind;
    }
    var rewind = setInterval(() => {
        video.currentTime -= speed / 100;
        if (video.currentTime <= end) {
            callback();
            clearInterval(rewind);
        }
    }, 10);
}

function backHome() {
    var fridgeVideo = document.getElementById('fridgeVideo');
    var fridgeButton = document.getElementById('fridgeButton');
    anime({
        targets: '#back',
        delay: 600,
        duration: 2500,
        easing: 'easeInOutQuart',
        opacity: 0,
        paddingLeft: 0,
    });
    videoRewind(fridgeVideo, () => {
        fridgeButton.style.display = 'inline';
    });
}

function searchBar() {
    
}

function foodLists() {
    var foodLists = document.getElementById('foodLists');
    var foodListTL = anime.timeline({
        targets: '#foodLists .foodList',
        delay: (el, i) => 800 + i * 200,
        duration: 500,
        easing: 'easeOutExpo',
    }).add({
        left: '100px'
    });
}

// function mark(x1, y1, x2, y2, text) {
//     var marksvg = document.createElement('svg');
//     var width = Math.abs(x1 - x2);
//     var height = Math.abs(y1 - y2);
//     marksvg.setAttribute('width', width);
//     marksvg.setAttribute('height', height);
//     // marksvg.style.zIndex = 9999;
//     // marksvg.style.cssText = `position: absolute; z-index: 100; width: ${width}px; height: ${height}px`;
//     var polyline = document.createElement('polyline');
//     polyline.setAttribute('points', `0,0 ${width/2},${height}`);
//     // polyline.setAttribute('stroke', 'red');
//     // polyline.setAttribute('stroke-width', '2');
//     polyline.style.cssText = 'fill: none; stroke: red; stroke-width: 2;';
//     document.body.appendChild(marksvg);
//     marksvg.appendChild(polyline);
// }
// mark(0, 0, 50, 50);

/**
 * 
 * @param {HTMLElement} focusOn  - want to focus on which HTMLElement.
 * @param {string} blurpx - blur of css like '5px'.
 * @param {string} backgroundColor - css color format like 'rgba(red, green, blue, alpha)'.
 * @param {number} durationOfDisappear - duration to complete disappearance.
 * @param {function} whenStartDisappear - callback a parameter type of HTMLElement about the blurred background when the background start disappears run it.
 * @param {function} whenDisappeared - callback function run it when the background disappears completely.
 */
function blurFocus(focusOn, blurpx, backgroundColor, durationOfDisappear, whenStartDisappear, whenDisappeared) {
    var blurbg = document.createElement('input');
    var style = blurbg.style;
    blurbg.style.cssText = "position: absolute; cursor: default; width: 100vw; height: 100vh";
    style.backgroundColor = backgroundColor;
    style.backdropFilter = 'blur(' + blurpx + ')';
    style[prefix[1] + 'BackdropFilter'] = 'blur(' + blurpx + ')';
    style.transitionDuration = durationOfDisappear + 'ms';
    blurbg.onfocus = () => {
        style.opacity = 0;
        if (whenStartDisappear != undefined) {
            whenStartDisappear(blurbg);
        }
        setTimeout(() => {
            blurbg.remove();
        }, durationOfDisappear);
        if (whenDisappeared != undefined) {
            whenDisappeared();
        }
    }
    focusOn.before(blurbg);
}

// function acButton() {
//     var acPage = document.getElementById('acPage');
//     acPage.style.opacity = 1;
//     blurFocus(acPage, '10px', 'rgba(255, 22, 25, 0.3)', 500, () => {
//         acPage.style.opacity = 0;
//     });
// }



/**
 * 動畫定義
 */
// 進入冰箱
var am_enterFridge = {
    back: anime({
        targets: '#back',
        delay: 600,
        duration: 2500,
        easing: 'easeInOutQuart',
        opacity: 1,
        paddingLeft: '20px',
        cursor: 'pointer',
        autoplay: false
    }),
    foodLists: anime.timeline({
        targets: '#foodLists',
        delay: 800,
        duration: 1000,
        easing: 'easeInOutQuart',
        opacity: 1,
        left: '5%',
        autoplay: false
    }).add({
        targets: '#foodLists .foodList',
        delay: (el, i) => 1000 + i * 200,
        translateX: [-100, 0],
        opacity: 1
    })
}