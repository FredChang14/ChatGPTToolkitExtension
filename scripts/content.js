(function () {
    "use strict";

    function b64EncodeUnicode(str) {
        const bytes = new TextEncoder().encode(str);
        const base64 = window.btoa(String.fromCharCode(...new Uint8Array(bytes)));
        return base64;
    }

    function isBase64Unicode(str) {
        // Base64編碼後的字串僅包含 A-Z、a-z、0-9、+、/、= 這些字元
        const base64Regex = /^[\w\+\/=]+$/;
        if (!base64Regex.test(str)) return false;

        try {
            const decoded = window.atob(str);

            // 解碼後的字串應該是合法的 UTF-8 序列
            // 使用 TextDecoder 檢查是否可以成功解碼為 Unicode 字串
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                bytes[i] = decoded.charCodeAt(i);
            }
            const decoder = new TextDecoder('utf-8');
            decoder.decode(bytes);

            // 如果沒有拋出異常，則表示是合法的 Base64Unicode 編碼字串
            return true;
        } catch (e) {
            // 解碼失敗，則不是合法的 Base64Unicode 編碼字串
            return false;
        }
    }

    function b64DecodeUnicode(str) {
        const bytes = Uint8Array.from(window.atob(str), c => c.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);
        return decoded;
    }

    const getParamFromHash = () => {
        // 解析 hash 中的查詢字串並取得所需的參數
        let hash = location.hash.substring(1);
        if (!hash) return [null, false];

        // 將 + 轉換為 %2B 可以避免 URLSearchParams 解析的問題
        // 理論上 prompt 不應該會出現 + 符號才對，因為 encodeURIComponent 不可能產生 + 符號
        hash = hash.replace(/\+/g, '%2B');

        let params = new URLSearchParams(hash);

        let prompt = params.get('prompt');
        if (!prompt) return [null, false];

        if (isBase64Unicode(prompt)) {
            prompt = b64DecodeUnicode(prompt);
        }

        // 解析參數
        prompt = prompt.replace(/\r/g, '')
            .replace(/\n{3,}/sg, '\n\n')
            .replace(/^\s+/sg, '')
        let submit = params.get("autoSubmit");

        let autoSubmit = false;
        if (submit == '1' || submit == 'true') {
            autoSubmit = true
        }

        if (!!prompt) {
            if (history.replaceState) {
                history.replaceState(null, document.title, window.location.pathname + window.location.search);
            } else {
                window.location.hash = '';
            }
        }

        return [prompt, autoSubmit];
    };

    if (location.hostname === 'gemini.google.com') {
        const [prompt, autoSubmit] = getParamFromHash();
        if (!prompt) return;

        var retry = 10;
        var ti = setInterval(() => {
            var textarea = document.querySelector('chat-window .textarea');
            if (textarea) {

                const lines = prompt.split('\n');
                textarea.innerHTML = '';
                lines.forEach(line => {
                    const paragraph = document.createElement('p');
                    paragraph.innerText = line;
                    textarea.appendChild(paragraph);
                });

                var button = document.querySelector('chat-window button.send-button');
                if (button) {

                    if (autoSubmit) {
                        button.focus();
                        setTimeout(() => {
                            // Gemini 一定要先 focus() 才能按下 click()
                            button.click();
                        }, 500);
                    }

                    clearInterval(ti);
                    return;
                }
            }

            retry--;

            if (retry == 0) {
                clearInterval(ti);
            }

        }, 500);

        return;
    }

    if (location.hostname === 'claude.ai') {
        const [prompt, autoSubmit] = getParamFromHash();
        if (!prompt) return;

        var retry = 10;
        var ti = setInterval(() => {
            var textarea = document.querySelector('div[contenteditable]');
            if (textarea) {
                const lines = prompt.split('\n');
                textarea.innerHTML = '';
                lines.forEach(line => {
                    const paragraph = document.createElement('p');
                    paragraph.innerText = line;
                    textarea.appendChild(paragraph);
                });

                var button = document.querySelector('button');
                if (button) {

                    if (autoSubmit) {
                        button.focus();
                        setTimeout(() => {
                            button.click();
                        }, 500);
                    }

                    clearInterval(ti);
                    return;
                }
            }

            retry--;

            if (retry == 0) {
                clearInterval(ti);
            }

        }, 500);

        return;
    }

    if (location.hostname === 'www.phind.com') {
        const [prompt, autoSubmit] = getParamFromHash();
        if (!prompt) return;

        var retry = 10;
        var ti = setInterval(() => {
            var textarea = document.querySelector('textarea[name="q"]');
            if (textarea) {
                textarea.value = prompt;
                textarea.dispatchEvent(new Event("input", { bubbles: true }));

                if (autoSubmit) {
                    textarea.form.submit();
                }

                clearInterval(ti);
                return;
            }

            retry--;

            if (retry == 0) {
                clearInterval(ti);
            }

        }, 500);

        return;
    }

    const AutoFillFromURI = (textarea, button) => {

        const [prompt, autoSubmit] = getParamFromHash();

        if (prompt && textarea && button) {
            textarea.value = prompt;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length); //將選擇範圍設定為文本的末尾
            textarea.scrollTop = textarea.scrollHeight; // 自動捲動到最下方

            if (autoSubmit) {
                setTimeout(() => {
                    if (!button.disabled) {
                        button.click();
                    }
                }, 1000);
            }

            history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
    }

    const StartMonitoringResponse = () => {

        // 預設的回應按鈕
        let defaultManualSubmitText = [];

        let lastBlock;

        const currentLocale = chrome.i18n?.getUILanguage();
        if (currentLocale) {
            if (currentLocale == 'zh-TW') {
                // exemplify
                defaultManualSubmitText.push({ text: "舉例說明", value: "請舉例說明" });
                // expand
                defaultManualSubmitText.push({ text: "提供細節", value: "請提供更多細節說明" });
                // translate to TC
                defaultManualSubmitText.push({ text: "翻譯成繁中", value: "請將上述回應內容翻譯成臺灣常用的正體中文" });
                // translate to EN
                defaultManualSubmitText.push({ text: "翻譯成英文", value: "Please translate the above response into English." });
            }
            else if (currentLocale == 'ja') {
                // exemplify
                defaultManualSubmitText.push({ text: "例えば", value: "例を挙げて説明して" });
                // expand
                defaultManualSubmitText.push({ text: "詳細説明", value: "もっと詳細に説明して" });
                // translate to JP
                defaultManualSubmitText.push({ text: "日本語に翻訳", value: "上述の返答内容を日本語に翻訳して" });
                // translate to EN
                defaultManualSubmitText.push({ text: "英語に翻訳", value: "Please translate the above response into English." });
            }
            else {
                // exemplify
                defaultManualSubmitText.push({ text: "More Examples", value: "Could you please provide me with more examples?" });
                // expand
                defaultManualSubmitText.push({ text: "More Details", value: "Could you please provide me with more details?" });
                // translate to EN
                defaultManualSubmitText.push({ text: "Translate to English", value: "Please translate the above response into English." });
            }
        }

        let mutationObserverTimer = undefined;
        const obs = new MutationObserver(() => {

            // 尋找聊天記錄的最後一筆，用來插入按鈕
            const talkBlocks = [...document.querySelectorAll('div[data-testid^="conversation-turn-"]')];
            if (!talkBlocks || !talkBlocks.length) {
                return;
            }

            if (location.pathname.startsWith('/gpts/editor')) {
                return;
            }

            // console.log(mutationObserverTimer)
            clearTimeout(mutationObserverTimer);
            mutationObserverTimer = setTimeout(() => {

                // 先停止觀察，避免自訂畫面變更被觀察到
                stop();

                // 重新建立回應按鈕
                rebuild_buttons();

                // 重新開始觀察
                start();

            }, 0);

        });

        function rebuild_buttons() {

            const talkBlocks = [...document.querySelectorAll('div[data-testid^="conversation-turn-"]')];

            let buttonsAreas = document.querySelectorAll('#custom-chatgpt-magic-box-buttons');

            // 如果正在回答問題中，就不要出現這些按鈕
            let stopButton = document.querySelector('button[aria-label="Stop generating"]');
            if (stopButton) {
                buttonsAreas?.forEach((item) => {
                    item.remove();
                });
                return;
            }

            // 如果還沒有輸入框，也不要顯示按鈕
            const promptTextarea = document.getElementById("prompt-textarea");
            if (!promptTextarea) {
                buttonsAreas?.forEach((item) => {
                    item.remove();
                });
                return;
            }

            // 如果因為編輯先前的提示導致整體 DOM 結構改變，就重建 Buttons
            if (lastBlock != talkBlocks[talkBlocks.length - 1]) {
                buttonsAreas?.forEach((item) => {
                    item.remove();
                });
            }

            buttonsAreas = document.querySelectorAll('#custom-chatgpt-magic-box-buttons');
            if (buttonsAreas.length > 0) {
                return;
            }

            // create a new buttons area
            let buttonsArea = document.createElement("div");
            buttonsArea.id = "custom-chatgpt-magic-box-buttons";
            buttonsArea.classList = "custom-buttons-area text-base m-auto md:max-w-2xl lg:max-w-2xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0";
            buttonsArea.style.overflowY = "auto";
            buttonsArea.style.display = "flex";
            buttonsArea.style.flexWrap = "wrap";
            buttonsArea.style.paddingTop = "0.75rem";
            buttonsArea.style.paddingLeft = "calc(30px + 0.75rem)";

            // add buttons to buttonsArea
            defaultManualSubmitText.forEach((item) => {

                const customButton = document.createElement("button");
                customButton.style.border = "1px solid #d1d5db";
                customButton.style.borderRadius = "5px";
                customButton.style.padding = "0.5rem 1rem";
                customButton.style.margin = "0.5rem";

                customButton.innerText = item.text;
                customButton.addEventListener("click", () => {
                    // 填入 prompt
                    const textarea = document.getElementById("prompt-textarea");
                    if (textarea) {
                        textarea.value = item.value;
                        textarea.dispatchEvent(new Event("input", { bubbles: true }));
                        textarea.focus();
                        textarea.setSelectionRange(textarea.value.length, textarea.value.length); //將選擇範圍設定為文本的末尾
                        textarea.scrollTop = textarea.scrollHeight; // 自動捲動到最下方

                        // 預設的送出按鈕
                        const sendButton = document.querySelector('button[data-testid="send-button"]');
                        if (sendButton) {
                            sendButton.click();
                        }
                    }
                });

                buttonsArea.append(customButton);
            });

            if (talkBlocks.length > 0) {
                lastBlock = talkBlocks[talkBlocks.length - 1];
                lastBlock.after(buttonsArea);
            }

        }

        const start = () => {
            // console.log('ChatGPT: Start Monitoring')
            obs.observe(document.body, {
                childList: true,
                attributes: true,
                subtree: true,
            });
        };

        const stop = () => {
            // console.log('ChatGPT: Stop Monitoring')
            obs.disconnect();
        };

        rebuild_buttons();

        start();

    };

    // 自動監控所有 ChatGPT 回應，用以判斷何時要顯示回應按鈕
    StartMonitoringResponse();

    const checkForTextareaInput = setInterval(() => {
        if (document.activeElement.tagName === 'TEXTAREA' && document.activeElement.id === 'prompt-textarea') {
            // 預設輸入 Prompt 的 textarea
            const textarea = document.activeElement;

            // 預設的送出按鈕
            const button = document.querySelector('button[data-testid="send-button"]');

            // 自動從 URL 填入提詞(Prompt)
            AutoFillFromURI(textarea, button);

            clearInterval(checkForTextareaInput);
        };
    }, 60);

    // 由於在切換歷史紀錄時會重建 main 元素，所以要監聽 document.body 的事件
    document.body.addEventListener('dblclick', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        // 找出最接近的對話列 DIV
        let closestDIV = event.target.closest('div[data-testid^="conversation-turn-"]');
        if (closestDIV) {
            // console.log('closestDIV: ', closestDIV)
            // 篩選出使用者的對話列 (使用者提示文字的圖示是 IMG，且 alt 屬性為 User)
            let userIMG = closestDIV.querySelector('img[alt="User"]');
            if (userIMG) {
                // console.log('userIMG: ', userIMG)
                // 找到這一區的最後一顆按鈕
                let btns = [...closestDIV.querySelectorAll('button')];
                if (btns.length > 0) {
                    let btn = btns[btns.length - 1];
                    // console.log('btn: ', btn)
                    btn.click();
                    setTimeout(() => {
                        let txt = closestDIV.querySelector('textarea')
                        if (txt) {
                            txt.selectionStart = txt.selectionEnd = txt.value.length;
                            txt.focus();
                        }
                    }, 0);
                }
            }
        }
    });

})();
