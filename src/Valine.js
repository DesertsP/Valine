require('./Valine.scss');
var md = require('marked');
var xss = require('xss');
var crypto = require('blueimp-md5');
const format = require('string-format');
const AV = require('leancloud-storage');

var GRAVATAR_BASE_URL = 'https://gravatar.loli.net/avatar/';
var DEFAULT_EMAIL_HASH = '9e63c80900d106cbbec5a9f4ea433a3e';
var IP_SERVICE = 'https://api.ipify.org/?format=json';


var i18n_set = {
    'zh-cn': {
        nick: '昵称',
        mail: '邮箱',
        link: '网站 (可选)',
        no_comment_yet: '快来做第一个评论的人吧~',
        submit: '提交',
        reply: '回复',
        cancel_reply: '取消回复',
        comment_count: '已有{}条评论',
        cancel: '取消',
        confirm: '确认',
        continue: '继续',
        more: '加载更多...',
        preview: '预览',
        emoji: '表情',
        error99: '初始化失败，请检查init中的`el`元素.',
        error100: '初始化失败，请检查你的AppId和AppKey.',
        error401: '未经授权的操作，请检查你的AppId和AppKey.',
        error403: '访问被api域名白名单拒绝，请检查你的安全域名设置.',
        seconds: '秒前',
        minutes: '分钟前',
        hours: '小时前',
        days: '天前',
        now: '刚刚',
        input_tips: '您输入的网址或邮箱格式不正确，请修正后提交！'

    },
    'en': {
        nick: 'Name',
        mail: 'Mail',
        link: 'Website(optional)',
        no_comment_yet: 'No comment yet.',
        submit: 'Submit',
        reply: 'Reply',
        cancel_reply: 'Cancel reply',
        comment_count: '{} comments here',
        cancel: 'Cancel',
        confirm: 'Confirm',
        continue: 'Continue',
        more: 'Load More...',
        preview: 'Preview',
        emoji: 'Emoji',
        error99: 'Initialization failed, Please check the `el` element in the init method.',
        error100: 'Initialization failed, Please check your appId and appKey.',
        error401: 'Unauthorized operation, Please check your appId and appKey.',
        error403: 'Access denied by api domain white list, Please check your security domain.',
        seconds: 'seconds ago',
        minutes: 'minutes ago',
        hours: 'hours ago',
        days: 'days ago',
        now: 'just now',
        input_tips: 'Please check your mail address and website link and try again.'
    }
}

var defaultComment = {
    ip: '',
    comment: '',
    rid: '',
    at: '',
    nick: '',
    mail: '',
    link: '',
    ua: navigator.userAgent,
    url: location.pathname,
    pin: 0
};

var disable_av_init = false;
var MAX_NEST_LEVEL = 3;
var PAGE_SIZE = 6;
var ADMIN_EMAIL_HASH = '';

const toString = {}.toString;
const store = localStorage;

class Valine {
    /**
     * Valine constructor function
     * @param {Object} option
     * @constructor
     */
    constructor(option) {
        let _root = this;
        // version
        _root.version = '1.2.1';
        getIp();
        // Valine init
        !!option && _root.init(option);
    }

    /**
     * Valine Init
     * @param {Object} option
     */
    init(option) {
        let _root = this;
        let av = option.av || AV;
        // disable_av_init = option.disable_av_init || false;
        MAX_NEST_LEVEL = option.max_nest || MAX_NEST_LEVEL;
        PAGE_SIZE = option.page_size || PAGE_SIZE;
        let lang = option.lang || 'en';
        _root.i18n = option.i18n || i18n_set[lang];
        defaultComment['url'] = option.pathname || location.pathname.replace(/\/$/, '');
        ADMIN_EMAIL_HASH = option.admin_email_hash || ADMIN_EMAIL_HASH;
        try {
            let el = toString.call(option.el) === "[object HTMLDivElement]" ? option.el : document.querySelectorAll(option.el)[0];
            if (toString.call(el) != '[object HTMLDivElement]') {
                throw `The target element was not found.`;
            }
            let count_el = toString.call(option.count_el) === "[object HTMLDivElement]" ? option.count_el : document.querySelectorAll(option.count_el)[0];
            if (toString.call(count_el) != '[object HTMLSpanElement]') {
                console.log(`The comment count <span> element ${option.count_el} was not found.`);
            }
            _root.el = el;
            _root.count_el = count_el;
            _root.el.classList.add('valine');
            let placeholder = option.placeholder || '';
            let eleHTML = `<div id="vinputs-placeholder">
                            <div class="vinputs-wrap">
                                <p class="vcancel-comment-reply" href="#" rel="nofollow" style="display:none">${_root.i18n['cancel_reply']}</p>
                                <div class="vinputs-area">
                                    <div class="textarea-wrapper">
                                        <div class="comment_trigger">
                                            <div class="avatar"><img class="visitor_avatar" src="${GRAVATAR_BASE_URL + DEFAULT_EMAIL_HASH + '?size=80'}"></div>
                                            <div class="trigger_title">${placeholder}</div>
                                        </div>
                                        <div class="veditor-area">
                                            <textarea placeholder="" class="veditor"></textarea>
                                            <div class="btn-wrap">
                                                <div class="vpreview-btn vfunction-btn" title="${_root.i18n['preview']}"><svg t="1551146416896" class="icon" style="" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2051" xmlns:xlink="http://www.w3.org/1999/xlink" width="1.5em" height="1.5em"><defs><style type="text/css"></style></defs><path d="M862.516 161.07l44.62 44.38-286.303 288.866-45.668-45.615L862.516 161.07z m1.233 1.233" p-id="2052"></path><path d="M832.162 959.558H128.025V191.784h512.099v64.169H192.037V895.64h576.112V512.127h64.012v447.431z m0.833 0.533" p-id="2053"></path><path d="M256.05 703.994h384.075v63.919H256.05v-63.919z m0-127.769l320.062-0.069v63.919H256.05v-63.85z m0-128.317h192.037v63.891l-192.037 0.028v-63.919z m0 0" p-id="2054"></path></svg></div>
                                                <div class="vemoji-btn vfunction-btn" title="${_root.i18n['emoji']}"><svg t="1551146424708" class="icon" style="" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2169" xmlns:xlink="http://www.w3.org/1999/xlink" width="1.5em" height="1.5em"><defs><style type="text/css"></style></defs><path d="M513.028 63.766c-247.628 0-448.369 200.319-448.369 447.426S265.4 958.617 513.028 958.617s448.369-200.319 448.369-447.426S760.655 63.766 513.028 63.766z m-0.203 823.563c-207.318 0-375.382-167.71-375.382-374.592s168.064-374.592 375.382-374.592 375.382 167.71 375.382 374.592-168.064 374.592-375.382 374.592z" p-id="2170"></path><path d="M514.029 767.816c-99.337 0-188.031-54.286-251.889-146.146-10.647-16.703-7.1-33.399 7.094-45.93 14.192-12.529 28.384-8.349 39.025 8.349 49.67 75.164 124.174 116.92 205.77 116.92s163.199-45.93 209.316-125.268c10.647-16.703 24.833-16.703 39.025-8.349 14.194 12.524 14.194 29.227 7.094 45.93-60.312 96.035-152.553 154.494-255.435 154.494zM464.292 402.959l-45.151-45.151-0.05 0.05-90.45-90.45-45.15 45.15 90.45 90.45-90.45 90.451 45.15 45.15 90.45-90.45 0.05 0.05 45.151-45.151-0.05-0.05zM556.611 402.959l45.151-45.151 0.05 0.05 90.45-90.45 45.15 45.15-90.45 90.45 90.45 90.451-45.15 45.15-90.45-90.45-0.05 0.05-45.151-45.151 0.05-0.05z" p-id="2171"></path></svg></div>
                                            </div>
                                        </div>
                                        <div class="vextra-area">
                                            <div class="vsmile-icons" style="display:none"></div>
                                            <div class="vpreview-text" style="display:none"></div>
                                        </div>
                                    </div>
                                    <section class="auth-section" style="display:none;">
                                        <div class="input-wrapper"><input type="text" name="author" class="vnick" placeholder="${_root.i18n['nick']}" value=""></div>
                                        <div class="input-wrapper"><input type="email" name="email" class="vmail" placeholder="${_root.i18n['mail']}" value=""></div>
                                        <div class="input-wrapper"><input type="text" name="website" class="vlink" placeholder="${_root.i18n['link']}" value=""></div>
                                        <div class="post-action"><button type="button" class="vsubmit">${_root.i18n['reply']}</button></div>
                                    </section>
                                    <div style="display:none;" class="vmark"></div>
                                </div>
                                <div class="vsubmitting" style="display:none;"></div>
                            </div>
                           </div>
                           <div class="info">
                                <div class="col"> ${format(_root.i18n['comment_count'], '<span class=\"count\">0</span>')}</div>
                           </div>
                           <ul class="vlist"><li class="vempty"></li></ul>
                           <div class="vloading"></div>
                           <div class="vpage txt-center"></div>`;
            _root.el.innerHTML = eleHTML;
            // Empty Data
            let vempty = _root.el.querySelector('.vempty');
            _root.nodata = {
                show(txt) {
                    vempty.innerHTML = txt || _root.i18n['no_comment_yet'];
                    vempty.setAttribute('style', 'display:block;');
                },
                hide() {
                    vempty.setAttribute('style', 'display:none;');
                }
            }
            _root.nodata.show();

            // load smiles image
            let _smile_wrapper = _root.el.querySelector('.vsmile-icons');
            let smile_names = option.emoticon_list || [];
            for (let i in smile_names) {
                let img = document.createElement('img');
                img.setAttribute('src', `${option.emoticon_url}/${smile_names[i]}`);
                _smile_wrapper.appendChild(img);
            }
            // set serverURLs

            let prefix = 'https://';
            let serverURLs = '';
            if (!option['serverURLs']) {
                switch (option.app_id.slice(-9)) {
                    // TAB 
                    case '-9Nh9j0Va':
                        prefix += 'tab.';
                        break;
                    // US
                    case '-MdYXbMMI':
                        prefix += 'us.';
                        break;
                    default:
                        break;
                }
            }
            serverURLs = option['serverURLs'] || prefix + 'avoscloud.com';

            if (!disable_av_init) {
                av.init({
                    appId: option.app_id || option.appId,
                    appKey: option.app_key || option.appKey,
                    serverURLs: serverURLs
                });
                disable_av_init = true;
            }
            _root.v = av;

        } catch (ex) {
            let issue = 'https://github.com/DesertsP/Valine/issues';
            if (_root.el) _root.nodata.show(`<pre style="color:red;text-align:left;">${ex}<br>Valine:<b>${_root.version}</b><br>feedback：${issue}</pre>`);
            else console && console.log(`%c${ex}\n%cValine%c${_root.version} ${issue}`, 'color:red;', 'background:#000;padding:5px;line-height:30px;color:#fff;', 'background:#456;line-height:30px;padding:5px;color:#fff;');
            return;
        }

        // loading
        let _spinner = `<div class="spinner"><div class="r1"></div><div class="r2"></div><div class="r3"></div><div class="r4"></div><div class="r5"></div></div>`;
        let vloading = _root.el.querySelector('.vloading');
        vloading.innerHTML = _spinner;
        // loading control
        _root.loading = {
            show() {
                vloading.setAttribute('style', 'display:block;');
                _root.nodata.hide();
            },
            hide() {
                vloading.setAttribute('style', 'display:none;');
                _root.el.querySelectorAll('.vcard').length === 0 && _root.nodata.show();
            }
        };

        _root.loading.hide()

        let vsubmitting = _root.el.querySelector('.vsubmitting');
        vsubmitting.innerHTML = _spinner;
        _root.submitting = {
            show() {
                vsubmitting.setAttribute('style', 'display:block;');
            },
            hide() {
                vsubmitting.setAttribute('style', 'display:none;');
                _root.nodata.hide();
            }
        };

        let _mark = _root.el.querySelector('.vmark');
        // alert
        _root.alert = {
            /**
             * {
             *  type:0/1,
             *  text:'',
             *  ctxt:'',
             *  otxt:'',
             *  cb:fn
             * }
             *
             * @param {Object} o
             */
            show(o) {
                _mark.innerHTML = `<div class="valert txt-center"><div class="vtext">${o.text}</div><div class="vbtns"></div></div>`;
                let _vbtns = _mark.querySelector('.vbtns');
                let _cBtn = `<button class="vcancel vbtn">${o && o.ctxt || _root.i18n['cancel']}</button>`;
                let _oBtn = `<button class="vsure vbtn">${o && o.otxt || _root.i18n['continue']}</button>`;
                _vbtns.innerHTML = `${_cBtn}${o.type && _oBtn}`;
                _mark.querySelector('.vcancel').addEventListener('click', function (e) {
                    _root.alert.hide();
                });
                _mark.setAttribute('style', 'display:block;');
                if (o && o.type) {
                    let _ok = _mark.querySelector('.vsure');
                    Event.on('click', _ok, (e) => {
                        _root.alert.hide();
                        o.cb && o.cb();
                    });
                }
            },
            hide() {
                _mark.setAttribute('style', 'display:none;');
            }
        }

        let query1 = new _root.v.Query('Comment');
        query1.equalTo('url', defaultComment['url']);
        let query2 = new _root.v.Query('Comment');
        query2.equalTo('url', defaultComment['url'] + '/');
        let query = AV.Query.or(query1, query2);
        query.notEqualTo('isSpam', true);
        query.count().then(count => {
            _root.el.querySelector('.count').innerHTML = count;
            if (toString.call(_root.count_el) == '[object HTMLSpanElement]') {
                _root.count_el.innerHTML = count;
            }
        })
        .catch(ex => {
            console.log(ex)
            _root.el.querySelector('.count').innerHTML=0
        });
        _root.bind(option);

    }

    /**
     * Bind Event
     */
    bind(option) {
        let _root = this;
        // Smile pictures
        let vsmiles = _root.el.querySelector('.vsmile-icons');
        Event.on('click', vsmiles, (e) => {
            var textField = _root.el.querySelector('.veditor');
            let imgSrc = e.target.src;
            if (typeof imgSrc == 'undefined') return;
            // var tag = " ![](/" + imgSrc.replace(/^.*\/(.*\.gif)$/, '$1') + ") ";
            var tag = "!(:" + decodeURI(imgSrc).replace(/^.*\/(.*)$/, '$1') + ":)";
            if (document.selection) {
                textField.focus();
                sel = document.selection.createRange();
                sel.text = tag;
                textField.focus();
            } else if (textField.selectionStart || textField.selectionStart == '0') {
                var startPos = textField.selectionStart;
                var endPos = textField.selectionEnd;
                var cursorPos = endPos;
                textField.value = textField.value.substring(0, startPos) + tag + textField.value.substring(endPos, textField.value.length);
                cursorPos += tag.length;
                textField.focus();
                textField.selectionStart = cursorPos;
                textField.selectionEnd = cursorPos
            } else {
                textField.value += tag;
                textField.focus()
            }
            defaultComment["comment"] = textField.value;
            let submitBtn = _root.el.querySelector('.vsubmit');
            if (submitBtn.getAttribute('disabled')) submitBtn.removeAttribute('disabled');
        })
        let comment_trigger = _root.el.querySelector('.comment_trigger');
        Event.on('click', comment_trigger, (e) => {
            comment_trigger.setAttribute('style', 'display:none');
            _root.el.querySelector('.auth-section').removeAttribute('style');
            _root.el.querySelector('.veditor').focus();
        })

        // cancel reply
        Event.on('click', _root.el.querySelector('.vcancel-comment-reply'), (e) => {
            _root.reset();
        });

        // Query && show comment list

        let expandEvt = (el) => {
            if (el.offsetHeight > 180) {
                el.classList.add('expand');
                Event.on('click', el, (e) => {
                    el.setAttribute('class', 'vcomment');
                })
            }
        };

        /*
        * 需要权衡: 网络请求数，查询效率，分页问题，Leancloud限制等
        * */

        var num = 1;
        var parent_count = 0;

        let parentQuery = (page_num = 1) => {
            _root.loading.show();
            let cq = _root.v.Query.doCloudQuery(`select nick, comment, link, rid, emailHash, isSpam
                                                   from Comment
                                                   where (rid='' or rid is not exists) and (url='${defaultComment["url"]}' or url='${defaultComment["url"] + "/"}')
                                                   order by -createdAt
                                                   limit ${(page_num - 1) * PAGE_SIZE},${PAGE_SIZE}`);
            cq.then(rets => {
                rets = rets && rets.results || [];
                let len = rets.length;
                if (len) {
                    // _root.el.querySelector('.vlist').innerHTML = '';
                    for (let i = 0; i < len; i++) {
                        if (rets[i].get('isSpam'))
                            continue;
                        let _parent_vcard = insertComment(rets[i], _root.el.querySelector('.vlist'), false);
                        _parent_vcard.setAttribute('style', 'margin-bottom: .5em');
                        nestQuery(_parent_vcard);
                    }
                    var _vpage = _root.el.querySelector('.vpage');
                    _vpage.innerHTML = PAGE_SIZE * page_num < parent_count ? `<div id="vmore" class="more">${_root.i18n['more']}</div>` : '';
                    var _vmore = _vpage.querySelector('#vmore');
                    if (_vmore) {
                        Event.on('click', _vmore, (e) => {
                            _vpage.innerHTML = '';
                            parentQuery(++num);
                        })
                    }
                }
                _root.loading.hide();
            }).catch(ex => {
                console.log(ex);
                _root.loading.hide();
            })
        };
        _root.v.Query.doCloudQuery(`select count(*)
                                    from Comment
                                    where (rid='' or rid is not exists) 
                                           and (url='${defaultComment["url"]}' or url='${defaultComment["url"] + "/"}')
                                    order by -createdAt`).then(data => {
            parent_count = data.count;
            parentQuery(1);
        });

        // 无限嵌套加载
        let nestQuery = (vcard, level = 1) => {
            var _vchild = vcard.querySelector('.vcomment-children');
            var _vlist = _vchild.querySelector('.vlist');
            var _id = vcard.getAttribute('id');
            if (level <= 0) {
                _vchild.setAttribute('style', 'margin-left: 0 !important');
            }
            if (level >= MAX_NEST_LEVEL) {
                _root.v.Query.doCloudQuery(`select count(*)
                               from Comment
                               where rid='${_id}' and (url='${defaultComment["url"]}' or url='${defaultComment["url"] + "/"}')
                               order by -createdAt`).then(function (data) {
                    let count = data.count;
                    if (count > 0) {
                        var _show_children_wrapper = _vchild.querySelector('.vshow-children-wrapper');
                        _show_children_wrapper.setAttribute('style', 'display: block !important;');
                        _show_children_wrapper.innerHTML = `<span class="vshow-children" rid="${_id}">${_root.i18n['more']}</span>`;
                        var _show_children = _show_children_wrapper.querySelector('.vshow-children');
                        Event.on('click', _show_children, (e) => {
                            _show_children_wrapper.setAttribute('style', 'display: none !important;');
                            nestQuery(vcard, -1000);
                        })

                    }
                }, function (error) {
                    console.log(error);
                });
                return;
            }

            _root.v.Query.doCloudQuery(`select nick, comment, link, rid, emailHash, isSpam
                           from Comment
                           where rid='${_id}' and (url='${defaultComment["url"]}' or url='${defaultComment["url"] + "/"}')
                           order by -createdAt`).then(rets => {
                rets = rets && rets.results || [];
                let len = rets.length;
                if (len) {
                    for (let i = 0; i < len; i++) {
                        if (!rets[i].get('isSpam')) {
                            let vl = insertComment(rets[i], _vlist, true)
                            nestQuery(vl, level + 1);
                        }

                    }
                }
            }).catch(ex => {
                console.log(ex);
                _root.loading.hide();
            })
        };

        let insertComment = (comment, vlist = null, top = true) => {
            let _vcard = document.createElement('li');
            _vcard.setAttribute('class', 'vcard');
            _vcard.setAttribute('id', comment.id);
            let emailHash = comment.get('emailHash');
            let gravatar_url = GRAVATAR_BASE_URL + emailHash + '?size=80&d=https%3a%2f%2fgravatar.loli.net%2favatar%2f9e63c80900d106cbbec5a9f4ea433a3e.jpg%3fsize%3d80';
            // language=HTML
            _vcard.innerHTML = `<div class="vcomment-body">
                                    <div class="vhead" >
                                        <img class="vavatar" src="${gravatar_url}"/>
                                        <a rid='${comment.id}' at='@${comment.get('nick')}' class="vat" id="at-${comment.id}">${_root.i18n['reply']}</a>
                                        <div class="vmeta-info">
                                            ${comment.get('link') ? `<a class="vname" href="${ comment.get('link') }" target="_blank" rel="nofollow" > ${comment.get("nick")}</a>` : `<span class="vname">${comment.get("nick")}</span>`}
                                            ${emailHash === ADMIN_EMAIL_HASH ? `<span class="spacer"> · </span><span class="vtime"><svg xmlns:xlink="http://www.w3.org/1999/xlink" p-id="1615" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" style="height: .8em;width: .8em;fill: #777;" class="icon" t="1559101574545"><defs><style type="text/css"></style></defs><path d="M582.044306 993.554603l17.113098-99.494753-72.233191-70.442285c-25.072678-24.27672-34.027206-57.109988-24.07773-87.555383 9.949475-30.445394 36.41508-51.538282 70.840264-56.51302l87.356393-12.735328c-3.780801-2.586864-7.163622-5.173727-10.347454-7.95958-10.944423-9.551496-18.705014-19.699961-23.480762-30.047415s-7.561601-21.092888-8.15857-31.440342c-0.596969-10.546444 0-20.893898 1.989895-31.042363 1.392927-8.15857 3.581811-15.123202 6.168675-20.893898 2.586864-5.770696 5.969685-10.546444 10.148465-14.725223 4.17878-3.97979 8.755538-7.95958 14.327244-11.541391 5.571706-3.780801 11.143412-8.15857 17.312087-13.730276 5.372717-4.775748 10.148465-11.342402 14.725223-19.898951 4.17878-8.357559 8.15857-17.113098 11.541391-25.868636 3.382822-9.949475 6.566654-20.694909 9.153517-31.440342 6.765643-1.989895 13.133307-5.571706 19.301982-11.143412 5.372717-4.775748 10.148465-11.342402 14.725223-19.898951 4.17878-8.556549 7.561601-19.699961 9.551496-34.027206 1.392927-10.944423 1.193937-19.898951-0.397979-27.460552-1.591916-7.561601-3.97979-13.531286-6.566654-18.307035-2.586864-5.571706-6.367664-9.750486-11.143412-12.337349 0.596969-27.062573-0.994948-54.324135-5.173727-81.386708-3.183832-23.082783-9.153517-47.558492-17.710066-73.626117s-21.291877-49.946366-38.205985-71.636222c-7.561601-9.551496-17.312087-18.904003-29.649436-28.05752-11.93937-9.153517-26.067625-17.312087-41.588807-24.873688-15.720171-7.561601-32.43529-13.531286-50.344345-18.307035s-37.012048-7.163622-56.51302-7.163622c-15.720171 0-31.838321 1.591916-48.35445 4.17878-16.715119 2.984843-33.032258 7.561601-49.349398 14.327244-16.31714 6.765643-32.43529 16.11815-48.35445 28.05752s-30.246405 27.062573-43.180723 45.369607c-13.531286 19.500972-23.878741 41.588807-31.042363 66.064516-7.163622 24.475709-12.13836 47.558492-14.725223 69.248348-3.581811 25.868636-4.775748 51.737272-4.17878 77.406918-5.571706 6.964633-9.750486 13.929265-12.337349 21.490867-2.785853 6.765643-4.576759 14.725223-5.571706 23.878741-1.193937 9.153517 0 19.699961 3.382822 31.042363 3.581811 11.541391 7.561601 20.29693 12.337349 26.465604 4.775748 6.168675 9.153517 10.944423 13.332297 14.327244 4.775748 3.581811 9.551496 5.770696 14.327244 7.163622 3.382822 10.745433 6.765643 21.291877 10.148465 31.440342 3.382822 8.755538 6.964633 17.312087 11.143412 25.868636 4.17878 8.556549 8.755538 15.123202 14.327244 19.898951 11.740381 9.551496 21.888846 18.705014 31.042363 27.460552 9.153517 8.755538 14.327244 21.291877 15.720171 37.609017 0.596969 10.347454 0.994948 19.898951 0.994948 28.654489 0 8.954528-1.591916 17.312087-4.576759 25.470657-2.984843 8.15857-8.556549 16.31714-16.31714 24.475709-7.760591 8.15857-18.705014 16.715119-33.032258 25.470657-17.511077 11.541391-38.006996 20.29693-61.487757 26.465604-23.480762 6.168675-125.761368 41.389817-147.849203 48.951419-21.888846 7.362612-41.190828 17.511077-57.507967 30.445394-16.11815 12.735328-26.266615 31.838321-30.445394 56.910999C2.387875 881.52351 0.994949 888.488143 4.57676 916.346674c3.581811 27.659541 9.153517 44.17567 16.715119 49.747377 6.168675 4.576759 23.679751 10.148465 52.931209 16.715119 29.251457 6.566654 213.11776 41.190828 426.633501 41.190828 27.858531 0 54.722114-0.596969 80.59075-1.790906C580.253401 1012.856585 580.45239 1003.305088 582.044306 993.554603z" p-id="1616"></path><path d="M1004.300038 748.399532l-106.459386-15.521182c-16.31714-2.387874-35.619122-16.31714-42.981733-31.241353l-47.558492-96.509911c-3.581811-7.362612-8.556549-11.143412-13.332297-11.143412-4.775748 0-9.551496 3.780801-13.332297 11.143412l-47.558492 96.509911c-7.362612 14.725223-26.664594 28.853478-42.981733 31.241353l-106.459386 15.521182c-16.31714 2.387874-20.09794 13.730276-8.15857 25.271667l77.008939 75.019044c11.740381 11.541391 19.102993 34.226195 16.31714 50.543335l-18.108045 106.061407c-1.989895 11.740381 2.586864 18.705014 10.745433 18.705014 3.183832 0 6.765643-0.994948 10.745433-3.183832l95.116984-50.145356c7.362612-3.780801 16.914108-5.770696 26.465604-5.770696 9.551496 0 19.301982 1.989895 26.465604 5.770696l95.116984 50.145356c3.97979 2.188885 7.760591 3.183832 10.745433 3.183832 8.15857 0 12.735328-6.964633 10.745433-18.705014l-18.108045-106.061407c-2.785853-16.31714 4.576759-39.001943 16.31714-50.543335l77.008939-75.019044C1024.198988 762.129808 1020.617177 750.787406 1004.300038 748.399532z" p-id="1617"></path></svg></span>` : ''}
                                            <span class="spacer"> · </span>
                                            <span class="vtime">${timeAgo(comment.get("createdAt"), _root.i18n)}</span>
                                        </div>
                                    </div>
                                    <section class="text-wrapper"  id="comment-${comment.id}">
                                        <div class="vcomment">${comment.get('comment')}</div>
                                    </section>
                                </div>
                                <div class="vcomment-children">
                                    <div class="vshow-children-wrapper" style="display: none"></div>
                                    <ul class="vlist" id="children-list-${comment.id}"></ul>
                                </div>`;
            let _vlist = vlist || _root.el.querySelector('.vlist');
            let _vlis = _vlist.querySelectorAll('li');
            // let _vat = _vcard.querySelector('.vat');
            let _as = _vcard.querySelectorAll('a');
            for (let i = 0, len = _as.length; i < len; i++) {
                let item = _as[i];
                if (item && item.getAttribute('class') != 'at') {
                    item.setAttribute('target', '_blank');
                    item.setAttribute('rel', 'nofollow');
                }
            }
            if (!top) _vlist.appendChild(_vcard);
            else _vlist.insertBefore(_vcard, _vlis[0]);
            let _vcontent = _vcard.querySelector('.vcomment');
            expandEvt(_vcontent);
            bindAtEvt(_vcard);
            return _vcard;
        };

        let mapping = {
            veditor: "comment",
            vnick: "nick",
            vlink: "link",
            vmail: 'mail'
        };
        let inputs = {};
        for (let i in mapping) {
            if (mapping.hasOwnProperty(i)) {
                let _v = mapping[i];
                let _el = _root.el.querySelector(`.${i}`);
                inputs[_v] = _el;
                Event.on('input', _el, (e) => {
                    // defaultComment[_v] = HtmlUtil.encode(_el.value.replace(/(^\s*)|(\s*$)/g, ""));
                    defaultComment[_v] = _el.value;
                });
            }
        }

        // cache
        let getCache = () => {
            let s = store && store.getItem('ValineCache');
            if (!!s) {
                s = JSON.parse(s);
                let m = ['nick', 'link', 'mail'];
                for (let i in m) {
                    let k = m[i];
                    _root.el.querySelector(`.v${k}`).value = s[k];
                    defaultComment[k] = s[k];
                }
                if (s['mail'] != '') {
                    let el = _root.el.querySelector('.visitor_avatar');
                    el.setAttribute('src', GRAVATAR_BASE_URL + crypto(s['mail'].toLowerCase().trim()) + '?size=80&d=https%3a%2f%2fgravatar.loli.net%2favatar%2f9e63c80900d106cbbec5a9f4ea433a3e.jpg%3fsize%3d80');
                }
            }
        };
        getCache();

        // reset form
        _root.reset = () => {
            for (let i in mapping) {
                if (mapping.hasOwnProperty(i)) {
                    let _v = mapping[i];
                    let _el = _root.el.querySelector(`.${i}`);
                    _el.value = "";
                    defaultComment[_v] = "";
                }
            }
            defaultComment['rid'] = '';
            defaultComment['nick'] = '';
            getCache();
            if (smile_icons.getAttribute('triggered')) {
                smile_icons.setAttribute('style', 'display:none;');
                smile_icons.removeAttribute('triggered');
            }
            if (preview_text.getAttribute('triggered')) {
                preview_text.setAttribute('style', 'display:none;');
                preview_text.removeAttribute('triggered');
            }
            _root.el.querySelector('.vcancel-comment-reply').setAttribute('style', 'display:none');
            _root.el.querySelector('#vinputs-placeholder').appendChild(_root.el.querySelector('.vinputs-wrap'));
        }

        // submit
        let submitBtn = _root.el.querySelector('.vsubmit');
        let submitEvt = (e) => {
            if (submitBtn.getAttribute('disabled')) {
                _root.alert.show({
                    type: 0,
                    text: '再等等，评论正在提交中ヾ(๑╹◡╹)ﾉ"',
                    ctxt: '好的'
                })
                return;
            }
            if (defaultComment.comment == '') {
                inputs['comment'].focus();
                return;
            }
            if (defaultComment.nick == '') {
                inputs['nick'].focus();
                return;
            }
            // render markdown
            defaultComment.comment = xss(md(defaultComment.comment.replace(/!\(:(.*?\.\w+):\)/g,
                `<img src="${option.emoticon_url}/$1" alt="$1" class="vemoticon-img">`)),
                {
                    onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
                        if (name === 'class') {
                            return name + '="' + xss.escapeAttrValue(value) + '"';
                        }
                    }
                });
            let idx = defaultComment.comment.indexOf(defaultComment.at);
            if (idx > -1 && defaultComment.at != '') {
                let at = `<a class="at" href='#${defaultComment.rid}'>${defaultComment.at}</a>`;
                defaultComment.comment = defaultComment.comment.replace(defaultComment.at, at);
            }
            // veirfy
            let mailRet = check.mail(defaultComment.mail);
            let linkRet = check.link(defaultComment.link);
            defaultComment['mail'] = mailRet.k ? mailRet.v : '';
            defaultComment['link'] = linkRet.k ? linkRet.v : '';

            if (!mailRet.k || !linkRet.k) {
                _root.alert.show({
                    type: 0,
                    text: _root.i18n['input_tips'],
                    ctxt: _root.i18n['confirm']
                })
            } else {
                commitEvt();
            }
        };

        let smile_btn = _root.el.querySelector('.vemoji-btn');
        let smile_icons = _root.el.querySelector('.vsmile-icons');
        Event.on('click', smile_btn, (e) => {
            if (preview_text.getAttribute('triggered')) {
                preview_text.setAttribute('style', 'display:none;');
                preview_text.removeAttribute('triggered');
            }
            if (smile_icons.getAttribute('triggered')) {
                smile_icons.setAttribute('style', 'display:none;');
                smile_icons.removeAttribute('triggered');
            }
            else {
                smile_icons.removeAttribute('style');
                smile_icons.setAttribute('triggered', 1);
            }
        });

        let preview_btn = _root.el.querySelector('.vpreview-btn');
        let preview_text = _root.el.querySelector('.vpreview-text');
        Event.on('click', preview_btn, (e) => {
            if (smile_icons.getAttribute('triggered')) {
                smile_icons.setAttribute('style', 'display:none;');
                smile_icons.removeAttribute('triggered');
            }
            if (preview_text.getAttribute('triggered')) {
                preview_text.setAttribute('style', 'display:none;');
                preview_text.removeAttribute('triggered');
            }
            else {
                if (defaultComment.comment == '') {
                    inputs['comment'].focus();
                    return;
                }
                // render markdown
                preview_text.innerHTML = xss(md(defaultComment.comment.replace(/!\(:(.*?\.\w+):\)/g,
                    `<img src="${option.emoticon_url}/$1" alt="$1" class="vemoticon-img">`)),
                    {
                        onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
                            if (name === 'class') {
                                return name + '="' + xss.escapeAttrValue(value) + '"';
                            }
                        }
                    });
                preview_text.removeAttribute('style');
                preview_text.setAttribute('triggered', 1);
            }
        });

        // setting access
        let getAcl = () => {
            let acl = new _root.v.ACL();
            acl.setPublicReadAccess(true);
            acl.setPublicWriteAccess(false);
            return acl;
        };

        let commitEvt = () => {
            submitBtn.setAttribute('disabled', true);
            _root.submitting.show();
            // 声明类型
            let Ct = _root.v.Object.extend('Comment');
            // 新建对象
            let comment = new Ct();
            for (let i in defaultComment) {
                if (defaultComment.hasOwnProperty(i)) {
                    if (i === 'at')
                        continue;
                    let _v = defaultComment[i];
                    comment.set(i, _v);
                }
            }
            comment.set('emailHash', crypto(defaultComment.mail.toLowerCase().trim()));
            comment.setACL(getAcl());
            comment.save().then((commentItem) => {
                store && store.setItem('ValineCache', JSON.stringify({
                    nick: defaultComment['nick'],
                    link: defaultComment['link'],
                    mail: defaultComment['mail']
                }));
                let _count = _root.el.querySelector('.count');
                _count.innerText = Number(_count.innerText) + 1;
                if (defaultComment['rid'] === '') {
                    insertComment(commentItem, null, true);
                } else {
                    // get children vlist
                    let _vlist = _root.el.querySelector('#children-list-' + defaultComment['rid']);
                    insertComment(commentItem, _vlist, true);
                }

                submitBtn.removeAttribute('disabled');
                _root.submitting.hide();
                _root.nodata.hide();
                _root.reset();
            }).catch(ex => {
                _root.submitting.hide();
            })
        };

        // at event
        let bindAtEvt = (vcard) => {
            let _id = vcard.getAttribute('id');
            let _vat = vcard.querySelector('#at-' + _id);
            Event.on('click', _vat, (e) => {
                let at = _vat.getAttribute('at');
                let rid = _vat.getAttribute('rid');
                defaultComment['rid'] = rid;
                defaultComment['at'] = at;
                inputs['comment'].value = `${at} ，` + inputs['comment'].value;
                // move inputs
                let _comment_el = vcard.querySelector('#comment-' + _id);
                _comment_el.appendChild(_root.el.querySelector('.vinputs-wrap'));
                _root.el.querySelector('.vcancel-comment-reply').removeAttribute('style');
                // remove comment trigger
                _root.el.querySelector('.comment_trigger').setAttribute('style', 'display:none');
                _root.el.querySelector('.auth-section').removeAttribute('style');
                _root.el.querySelector('.veditor').focus();
                // focus
                inputs['comment'].focus();
            })
        };

        Event.off('click', submitBtn, submitEvt);
        Event.on('click', submitBtn, submitEvt);
    }
}

const Event = {
    on(type, el, handler, capture) {
        if (el.addEventListener) el.addEventListener(type, handler, capture || false);
        else if (el.attachEvent) el.attachEvent(`on${type}`, handler);
        else el[`on${type}`] = handler;
    },
    off(type, el, handler, capture) {
        if (el.removeEventListener) el.removeEventListener(type, handler, capture || false);
        else if (el.detachEvent) el.detachEvent(`on${type}`, handler);
        else el[`on${type}`] = null;
    }
}

const check = {
    mail(m) {
        return {
            k: /\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]{2,14}/.test(m),
            v: m
        };
    },
    link(l) {
        if (l.length > 0) {
            l = /^(http|https)/.test(l) ? l : `http://${l}`;
        }
        return {
            k: l.length > 0 ? /(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/.test(l) : true,
            v: l
        };
    }
}


const dateFormat = (date) => {
    var vDay = padWithZeros(date.getDate(), 2);
    var vMonth = padWithZeros(date.getMonth() + 1, 2);
    var vYear = padWithZeros(date.getFullYear(), 2);
    // var vHour = padWithZeros(date.getHours(), 2);
    // var vMinute = padWithZeros(date.getMinutes(), 2);
    // var vSecond = padWithZeros(date.getSeconds(), 2);
    return `${vYear}-${vMonth}-${vDay}`;
    // return `${vYear}-${vMonth}-${vDay} ${vHour}:${vMinute}:${vSecond}`;
}

const timeAgo = (date, i18n) => {
    try {
        var oldTime = date.getTime();
        var currTime = new Date().getTime();
        var diffValue = currTime - oldTime;

        var days = Math.floor(diffValue / (24 * 3600 * 1000));
        if (days === 0) {
            //计算相差小时数
            var leave1 = diffValue % (24 * 3600 * 1000); //计算天数后剩余的毫秒数
            var hours = Math.floor(leave1 / (3600 * 1000));
            if (hours === 0) {
                //计算相差分钟数
                var leave2 = leave1 % (3600 * 1000); //计算小时数后剩余的毫秒数
                var minutes = Math.floor(leave2 / (60 * 1000));
                if (minutes === 0) {
                    //计算相差秒数
                    var leave3 = leave2 % (60 * 1000); //计算分钟数后剩余的毫秒数
                    var seconds = Math.round(leave3 / 1000);
                    return seconds + ' ' + i18n['seconds'];
                }
                return minutes + ' ' + i18n['minutes'];
            }
            return hours + ' ' + i18n['hours'];
        }
        if (days < 0)
            return i18n['now'];
        else
            return days + ' ' + i18n['days'];
        return dateFormat(date);
    } catch (error) {
        console.log(error)
    }
}

const padWithZeros = (vNumber, width) => {
    var numAsString = vNumber.toString();
    while (numAsString.length < width) {
        numAsString = '0' + numAsString;
    }
    return numAsString;
}

const loadJS = function (url, success) {
    var domScript = document.createElement('script');
    domScript.src = url;
    success = success || function () {
    };
    domScript.onload = domScript.onreadystatechange = function () {
        if (!this.readyState || 'loaded' === this.readyState || 'complete' === this.readyState) {
            success();
            this.onload = this.onreadystatechange = null;
            // this.parentNode.removeChild(this);
        }
    };
    document.getElementsByTagName('head')[0].appendChild(domScript);
};

const getIp = function(){
    var request = new XMLHttpRequest();
    request.open('GET', IP_SERVICE, true);

    request.onload = function() {
    if (this.status >= 200 && this.status < 400) {
        var data = JSON.parse(this.response);
        defaultComment['ip'] = data.ip;
    } else {
    }
    };

    request.onerror = function() {
    };

    request.send();

};


module.exports = Valine;
