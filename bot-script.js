console.log('BOT INJECTED')

const mFormat = (text) => {
    var x = 3
    var n = 0
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    if(text === undefined) text = 0
    return parseInt(text).toFixed(Math.max(0, n)).replace(new RegExp(re, 'g'), '$&.');
}

const getCurrentBid = async () => {
    const data = await $.ajax({
        url: $("#get-penawaran-url").val(),
        type: "POST",
        dataType: "json",
        data: {
          token: Cookies.get("token"),
          id_lot_lelang: $("#id-lot-lelang").val(),
        }
    })
    return data
}

const getServerTime = async () => {
    const data = await $.ajax({
        url: 'https://portal.lelang.go.id/api/waktu-server/teks?no-cache=Po31HBxhrFbJIvYjSCsz',
        type: "GET"
    })
    const interval = 60000 - data.interval
    const time = Math.floor(new Date(data.waktu_server).getTime()) + interval
    return time
}

const parseMonth = (_date) => {
    let date = _date.toLowerCase()
    const months = {
        januari: 'january',
        februari: 'february',
        maret: 'march',
        april: 'april',
        mei: 'may',
        juni: 'june',
        juli: 'july',
        agustus: 'august',
        september: 'september',
        oktober: 'october',
        november: 'november',
        desember: 'december'
    }
    for (const key in months) {
        if (Object.prototype.hasOwnProperty.call(months, key)) {
            const value = months[key];
            date = date.split(key).join(value)
        }
    }
    return date
}

const getEndTime = () => {
    const text = $('.hide_on_success table tr').eq(3).children('td').eq(2).text().split(' jam').join('')
    return text
}

const getPenawaranData = () => {
    const datas = $(".data-penawaran").serializeArray();
    const _datas = {}
    for (const data of datas) {
        _datas[data.name] = data.value
    }
    return _datas
}

const validatePassword = () => {
    const dataPenawaran = getPenawaranData()
    if(!dataPenawaran.password) {
        alert("Password harus diisi terlebih dahulu")
        return true
    }
    return false
}

let botStatus = 'stop'
let waitFirst = true
let maxBidFirst = true
let usFirst = true
let testUs = false
let lastBidNilai = 0
const startBot = async () => {
    lastBidNilai = 0
    waitFirst = true
    maxBidFirst = true
    usFirst = true
    doLastBid = false
    if(validatePassword()) return
    addLog("Bot Started")
    $("#bot-btn-start").attr('disabled', 'disabled')
    $("#bot-btn-stop").removeAttr('disabled')
    botStatus = 'start'
    const endTime = parseMonth(getEndTime())
    const time = Math.floor(new Date(endTime).getTime())
    while(botStatus == 'start') {
        const now = getNow()
        const diff = Math.floor((time - now) / 1000)
        const start = getStart()
        const delay = getDelayCheck()
        if(start > diff) {
            const currentBid = await getCurrentBid()
            if(currentBid.status == "success") {
                if(!doLastBid && (time - now) <= 500 && isLastBid()) {
                    doLastBid = true
                    console.log('DO LAST BID')
                    // const maxBid = parseInt(getMaxBid())
                    // const incBid = getLastBid()
                    // const lastBid = currentBid.penawaran === null ? parseInt($("#nilai-limit").val()) : currentBid.penawaran[1]
                    // const nextBid = parseInt(lastBid.nilai) + parseInt(incBid)
                    // if(maxBid < nextBid) {
                    //     if(maxBidFirst) {
                    //         maxBidFirst = false
                    //         addLog('Melebihi Maksimal Bid')
                    //         stopBot()
                    //     }
                    //     continue
                    // }
                }
                if(currentBid.penawaran === null) {
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                const lastBid = currentBid.penawaran[1]
                if(lastBid.penawaran_saya) {
                    if(usFirst) {
                        usFirst = false
                        addLog('Bid Terkahir Milik Kita')
                    }
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                const maxBid = parseInt(getMaxBid())
                const incBid = getIncBid()
                const nextBid = parseInt(lastBid.nilai) + parseInt(incBid)
                if(maxBid < nextBid) {
                    if(maxBidFirst) {
                        maxBidFirst = false
                        addLog('Melebihi Maksimal Bid')
                        stopBot()
                    }
                    continue
                }
                if(lastBidNilai == lastBid.nilai) {
                    await new Promise(r => setTimeout(r, delay));
                    continue
                }
                lastBidNilai = lastBid.nilai
                usFirst = true
                setPenawaran(nextBid)
                addLog(`Mencoba Bid ${mFormat(nextBid)}`)
                await doPenawaran()
            }
        } else {
            if(waitFirst) {
                addLog(`Menunggu Sampai ${start} Detik Sebelum Bid Selesai`)
                waitFirst = false
            }
        }
        await new Promise(r => setTimeout(r, delay));
    }
    $("#bot-btn-stop").attr('disabled', 'disabled')
    $("#bot-btn-start").removeAttr('disabled')
    addLog("Bot Stopped")
    addLog("=====================================")
}

const doPenawaran = async () => {
    $("body").prepend(
        '<input name="token" type="hidden" id="temp-token" value="' +
        Cookies.get("token") +
        '" class="data-penawaran">'
    );
    var dataPenawaran = $(".data-penawaran").serialize();
    console.log({
        url: $("#kirim-penawaran-url").val(),
        type: "POST",
        dataType: "json",
        data: dataPenawaran
    })
    $("#temp-token").remove();
    const data = await $.ajax({
        url: $("#kirim-penawaran-url").val(),
        type: "POST",
        dataType: "json",
        data: dataPenawaran
    });
    getPenawaranTertinggi();
    addLog(`Response: ${data?.message}`)
    return data
}

const stopBot = () => {
    botStatus = 'stop'
    $("#bot-btn-stop").attr('disabled', 'disabled')
}

let now = 0
const getNow = () => {
    return now
}

const setTime = async () => {
    now = await getServerTime()
    setInterval(async () => {
        now += 100
        const date = new Date(now);
        $('#server-time').text(date);
        $('#server-time2').text(date);
    }, 100);
}

const setPenawaran = (penawaranBaru) => {
    $("#nilai-penawaran-shown").val(penawaranBaru);
    $("#nilai-penawaran").val(penawaranBaru);
}

const addLog = (text) => {
    const now = getNow()
    const log = $('#bot-log').val()
    const logs = log.split("\n")
    const lastLog = logs[0]
    if(lastLog == text) return
    $('#bot-log').val(now + " - " + text + "\n" + log)
}

const getKelipatanBid = () => parseInt($("#kelipatan-bid").val());
const getDelayCheck = () => parseInt($("#bot-delay-check").val());
const getStart = () => parseInt($("#bot-start-second").val());
const getMaxBid = () => parseInt($("#bot-max-bid").val());
const getIncBid = () => parseInt($("#bot-inc-bid").val());
const getLastBid = () => parseInt($("#bot-last-bid").val());

const formatMoney = (text) => {
    var x = 3
    var n = 0
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    if(text === undefined) text = 0
    return parseInt(text).toFixed(Math.max(0, n)).replace(new RegExp(re, 'g'), '$&.');
}

const inputMoney = (hiddenId, displayId) => {
    const hiddenInput = document.getElementById(hiddenId);
    const displayInput = document.getElementById(displayId);

    function updateDisplay() {
        const value = hiddenInput.value;
        displayInput.value = formatMoney(value);
    }

    displayInput.addEventListener('input', function(e) {
        // Remove non-digit characters
        let value = this.value.replace(/[^\d]/g, '');
        
        // Update hidden input with actual value
        hiddenInput.value = value;
        
        // Update display with formatted value
        updateDisplay();
    });

    // Initial formatting
    updateDisplay();
}

const isLastBid = () => {
    const inputField = document.getElementById('toggleCheckbox');
    return inputField.checked || false
}

const main = async () => {
    $('#estimasi-waktu-server').after(`<div id="server-time2"></div>`);
    try {
        $(".session-countdown").countdown("stop")   
    } catch (error) {}
    setInterval(() => {
        const link = $(".renewSessionButton").attr('href');
        fetch(link);
    }, 60000 * 4);
    setTime()
    if(!window.location.href.includes('portal.lelang.go.id/penawaran/kirim')) return
    const kelipatanBid = getKelipatanBid()
    let penawaran = parseInt($("#nilai-limit").val()) + (kelipatanBid * 5);
    const currentBid = await getCurrentBid()
    if(currentBid.status == "success" && currentBid.penawaran && currentBid.penawaran[1]) {
        penawaran = parseInt(currentBid.penawaran[1].nilai) + (kelipatanBid * 5);
    }
    const endTime = getEndTime()
    $('.main .row .col-md-9 .row.mt-lg')
    .before(`<div style="border: solid;border-color: #0761ad;padding: 16px;">
        <h1>BoLang (Bot Lelang) - End: ${endTime}</h1>
        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label class="col-sm-12 control-label mt-sm">Maksimal Bid</label>
                    <div class="input-group input-group-icon">
                        <span class="input-group-addon">Rp.</span>
                        <input id="bot-max-bid-display" class="form-control" type="text" inputmode="numeric">
                    </div>
                    <input id="bot-max-bid" value="${penawaran}" class="form-control number-format" type="hidden">
                </div>
                <div class="form-group">
                    <label class="col-sm-12 control-label mt-sm">Mulai Bot Sebelum Close</label>
                    <div class="input-group input-group-icon">
                        <input id="bot-start-second" value="5" class="form-control number-format" type="text">
                        <span class="input-group-addon">Detik</span>
                    </div>
                </div>
                <div class="form-group">
                    <label class="col-sm-12 control-label mt-sm">Kelipatan Bid</label>
                    <div class="input-group input-group-icon">
                        <span class="input-group-addon">Rp.</span>
                        <input id="bot-inc-bid-display" class="form-control number-format" type="text" inputmode="numeric">
                    </div>
                    <input id="bot-inc-bid" value="${kelipatanBid}" class="form-control number-format" type="hidden">
                </div>
                <div class="form-group">
                    <label class="col-sm-12 control-label mt-sm">Delay Cek Penawaran</label>
                    <div class="input-group input-group-icon">
                        <input id="bot-delay-check" value="0" class="form-control number-format" type="text">
                        <span class="input-group-addon">Milisecond</span>
                    </div>
                </div>
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" id="toggleCheckbox">
                    <label class="form-check-label" for="toggleCheckbox">Aktifkan Last Bidding</label>
                </div>
                <div class="form-group" id="textInput" style="display: none;">
                    <label class="col-sm-12 control-label mt-sm">Nilai Kenaikan Last Bid</label>
                    <div class="input-group input-group-icon">
                        <span class="input-group-addon">Rp.</span>
                        <input id="bot-last-bid-display" class="form-control number-format" type="text" inputmode="numeric">
                    </div>
                    <input id="bot-last-bid" value="${kelipatanBid * 5}" class="form-control number-format" type="hidden">
                </div>
                <div class="form-group mt-lg">
                    <button id="bot-btn-start" class="btn btn-lg btn-success mb-sm mr-md">Start Bot</button>
                    <button id="bot-btn-stop" class="btn btn-lg btn-warning mb-sm mr-md" disabled>Stop Bot</button>
                    <button id="bot-btn-test" class="btn btn-lg btn-info mb-sm">Test Tawar</button>
                </div>
                <div>
                    Server Time: <span id="server-time"></span>
                </div>
            </div>
            <div class="col-md-6">
                <textarea disabled id="bot-log" style="width: 100%;height: 400px;padding: 10px;"></textarea>
            </div>
        </div>
    </div>`);
    document.getElementById('toggleCheckbox').addEventListener('change', function () {
        const inputField = document.getElementById('textInput');
        inputField.style.display = this.checked ? 'block' : 'none';
    });
    $("#bot-btn-start").click(() => {
        startBot()
    })
    $("#bot-btn-stop").click(() => {
        stopBot()
    })
    $("#bot-btn-test").click(async () => {
        if(validatePassword()) return
        const kelipatanBid = getKelipatanBid()
        let penawaran = parseInt($("#nilai-limit").val()) + kelipatanBid;
        const currentBid = await getCurrentBid()
        if(currentBid.status == "success" && currentBid.penawaran) {
            penawaran = parseInt(currentBid.penawaran[1].nilai) + kelipatanBid;
        }
        setPenawaran(penawaran)
        addLog(`Mencoba Bid ${mFormat(penawaran)}`)
        await doPenawaran()
    })

    inputMoney('bot-max-bid', 'bot-max-bid-display')
    inputMoney('bot-inc-bid', 'bot-inc-bid-display')
    inputMoney('bot-last-bid', 'bot-last-bid-display')
}

$(document).ready(function () {
    main()
});