/**
 * main.js - 개선된 SMS 분석, 주소 필수 검증, UI 개선 포함
 */

// ==========================================
// 1. DATA LAYER (Global Variables)
// ==========================================
let MEM_RECORDS = [];
let MEM_LOCATIONS = {};
let MEM_FARES = {};
let MEM_CENTERS = [];
let MEM_DISTANCES = {};
let MEM_COSTS = {};
let MEM_EXPENSE_ITEMS = [];

function loadAllData() {
    try {
        const records = JSON.parse(localStorage.getItem('records')) || [];
        MEM_RECORDS.length = 0;
        if (Array.isArray(records)) MEM_RECORDS.push(...records);

        const locs = JSON.parse(localStorage.getItem('saved_locations')) || {};
        for (let k in MEM_LOCATIONS) delete MEM_LOCATIONS[k];
        Object.assign(MEM_LOCATIONS, locs);

        const fares = JSON.parse(localStorage.getItem('saved_fares')) || {};
        for (let k in MEM_FARES) delete MEM_FARES[k];
        Object.assign(MEM_FARES, fares);

        const centers = JSON.parse(localStorage.getItem('logistics_centers')) || [];
        MEM_CENTERS.length = 0;
        if (Array.isArray(centers)) MEM_CENTERS.push(...centers);
        
        if (MEM_CENTERS.length === 0) MEM_CENTERS.push('안성', '안산', '용인', '이천', '인천');
        MEM_CENTERS.sort(); 

        const dists = JSON.parse(localStorage.getItem('saved_distances')) || {};
        for (let k in MEM_DISTANCES) delete MEM_DISTANCES[k];
        Object.assign(MEM_DISTANCES, dists);

        const costs = JSON.parse(localStorage.getItem('saved_costs')) || {};
        for (let k in MEM_COSTS) delete MEM_COSTS[k];
        Object.assign(MEM_COSTS, costs);

        const items = JSON.parse(localStorage.getItem('saved_expense_items')) || [];
        MEM_EXPENSE_ITEMS.length = 0;
        if (Array.isArray(items)) MEM_EXPENSE_ITEMS.push(...items);

        syncHistoryToAutocompleteDB();
    } catch (e) {
        console.error("데이터 로드 중 오류:", e);
    }
}

function saveData() {
    MEM_RECORDS.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    localStorage.setItem('records', JSON.stringify(MEM_RECORDS));
    localStorage.setItem('saved_locations', JSON.stringify(MEM_LOCATIONS));
    localStorage.setItem('saved_fares', JSON.stringify(MEM_FARES));
    
    MEM_CENTERS.sort();
    localStorage.setItem('logistics_centers', JSON.stringify(MEM_CENTERS));
    
    localStorage.setItem('saved_distances', JSON.stringify(MEM_DISTANCES));
    localStorage.setItem('saved_costs', JSON.stringify(MEM_COSTS));
    
    localStorage.setItem('saved_expense_items', JSON.stringify(MEM_EXPENSE_ITEMS));
}

function updateLocationData(name, address, memo) {
    if (!name) return;
    const trimmed = name.trim();
    if (!MEM_CENTERS.includes(trimmed)) {
        MEM_CENTERS.push(trimmed);
        MEM_CENTERS.sort(); 
    }
    if (address || memo) {
        MEM_LOCATIONS[trimmed] = { ...(MEM_LOCATIONS[trimmed] || {}), address: address || (MEM_LOCATIONS[trimmed]?.address || ''), memo: memo || (MEM_LOCATIONS[trimmed]?.memo || '') };
    }
    saveData();
}

function updateExpenseItemData(item) {
    if (!item) return;
    const trimmed = item.trim();
    if (!MEM_EXPENSE_ITEMS.includes(trimmed)) {
        MEM_EXPENSE_ITEMS.push(trimmed);
        MEM_EXPENSE_ITEMS.sort();
        saveData();
    }
}

function syncHistoryToAutocompleteDB() {
    let updated = false;
    MEM_RECORDS.forEach(r => {
        if (r.type === '화물운송' && r.from && r.to) {
            const key = `${r.from.trim()}-${r.to.trim()}`;
            if (r.income > 0 && !MEM_FARES[key]) { MEM_FARES[key] = r.income; updated = true; }
            if (r.distance > 0 && !MEM_DISTANCES[key]) { MEM_DISTANCES[key] = r.distance; updated = true; }
            if (r.cost > 0 && !MEM_COSTS[key]) { MEM_COSTS[key] = r.cost; updated = true; }
        }
    });
    if (updated) saveData();
}

function addRecord(record) {
    if (record.type === '화물운송' && record.from && record.to) {
        const key = `${record.from}-${record.to}`;
        if(record.income > 0) MEM_FARES[key] = record.income;
        if(record.distance > 0) MEM_DISTANCES[key] = record.distance;
        if(record.cost > 0) MEM_COSTS[key] = record.cost;
    }
    MEM_RECORDS.push(record);
    saveData();
}

function removeRecord(id) {
    const idx = MEM_RECORDS.findIndex(r => r.id === id);
    if(idx > -1) {
        MEM_RECORDS.splice(idx, 1);
        saveData();
    }
}

// ==========================================
// 2. UTILS
// ==========================================
const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getCurrentTimeString = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const formatToManwon = (val) => isNaN(val) ? '0' : Math.round(val / 10000).toLocaleString('ko-KR');

function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    if(toast){
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1500);
    }
}

function copyTextToClipboard(text, msg) {
    if (!text) return;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { 
        document.execCommand('copy'); 
        showToast(msg || '복사되었습니다.'); 
        document.body.removeChild(ta);
    } 
    catch (e) { 
        document.body.removeChild(ta);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => showToast(msg || '복사되었습니다.'))
                .catch(err => console.log('복사 실패:', err));
        } else {
            console.error('복사 기능 지원되지 않음');
        }
    }
}

function getStatisticalDate(dateStr, timeStr) {
    if (!dateStr || !timeStr) return dateStr;
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour >= 4) return dateStr;
    const parts = dateStr.split('-'); 
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; 
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d, 12, 0, 0);
    dateObj.setDate(dateObj.getDate() - 1); 
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    return `${newY}-${newM}-${newD}`;
}

function safeInt(value) {
    if (!value) return 0;
    const num = parseInt(String(value).replace(/,/g, ''), 10);
    return isNaN(num) ? 0 : num;
}

function safeFloat(value) {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

// ==========================================
// 3. UI FUNCTIONS
// ==========================================
function toggleUI() {
    const typeSelect = document.getElementById('type');
    const editModeIndicator = document.getElementById('edit-mode-indicator');
    const smsSection = document.getElementById('sms-parser-section');
    if(!typeSelect || !editModeIndicator) return;

    const type = typeSelect.value;
    const isEditMode = !editModeIndicator.classList.contains('hidden');

    const sections = ['transport-details', 'fuel-details', 'supply-details', 'expense-details', 'cost-info-fieldset', 'trip-actions', 'general-actions', 'edit-actions'];
    sections.forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); });
    
    const costWrapper = document.getElementById('cost-wrapper');
    const incomeWrapper = document.getElementById('income-wrapper');

    if (type === '화물운송' || type === '대기') {
        document.getElementById('transport-details')?.classList.remove('hidden');
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        costWrapper?.classList.add('hidden');
        incomeWrapper?.classList.remove('hidden');
    } else {
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        incomeWrapper?.classList.add('hidden');
        costWrapper?.classList.remove('hidden');
        if (type === '주유소') document.getElementById('fuel-details')?.classList.remove('hidden');
        else if (type === '지출') document.getElementById('expense-details')?.classList.remove('hidden');
    }

    if (isEditMode) {
        document.getElementById('edit-actions')?.classList.remove('hidden'); 
        smsSection?.classList.add('hidden'); 
    } else {
        smsSection?.classList.remove('hidden');
        if (['화물운송', '대기'].includes(type)) {
            document.getElementById('trip-actions')?.classList.remove('hidden');
        } else {
            document.getElementById('general-actions')?.classList.remove('hidden');
        }
    }
}

function editRecord(id) {
    const r = MEM_RECORDS.find(x => x.id === id);
    if(!r) return;

    document.getElementById('date').value = r.date; 
    document.getElementById('time').value = r.time; 
    document.getElementById('type').value = r.type;
    document.getElementById('from-center').value = r.from || ''; 
    document.getElementById('to-center').value = r.to || '';
    document.getElementById('manual-distance').value = r.distance || ''; 
    document.getElementById('income').value = r.income ? (r.income/10000) : ''; 
    document.getElementById('cost').value = r.cost ? (r.cost/10000) : '';
    document.getElementById('edit-id').value = id; 
    
    document.getElementById('edit-mode-indicator')?.classList.remove('hidden');
    document.getElementById('date').disabled = true; 
    document.getElementById('time').disabled = true;
    
    toggleUI(); 
    const fromIn = document.getElementById('from-center');
    const toIn = document.getElementById('to-center');
    if(fromIn) fromIn.dispatchEvent(new Event('input'));
    if(toIn) toIn.dispatchEvent(new Event('input'));

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function displayCenterList(filter='') {
    const container = document.getElementById('center-list-container');
    if(!container) return;
    container.innerHTML = "";
    const list = MEM_CENTERS.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
    list.forEach(c => {
        const div = document.createElement('div');
        div.className='center-item';
        div.innerHTML=`<div class="info"><span class="center-name">${c}</span></div>`;
        container.appendChild(div);
    });
}

function populateCenterDatalist() {
    const dl = document.getElementById('center-list');
    if(dl) dl.innerHTML = MEM_CENTERS.map(c => `<option value="${c}"></option>`).join('');
}

function populateExpenseDatalist() {
    const dl = document.getElementById('expense-list');
    if(dl) dl.innerHTML = MEM_EXPENSE_ITEMS.map(item => `<option value="${item}"></option>`).join('');
}

function updateAddressDisplay() {
    const fromVal = document.getElementById('from-center').value.trim();
    const toVal = document.getElementById('to-center').value.trim();
    const displayEl = document.getElementById('address-display');
    
    if(!displayEl) return;
    
    let html = '';

    if (fromVal && MEM_LOCATIONS[fromVal]) {
        const loc = MEM_LOCATIONS[fromVal];
        html += `<div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #ccc;">
            <span style="font-weight:bold; color:#007bff;">[상차] ${fromVal}</span>`;
        if (loc.address) {
            html += `<div class="address-clickable" data-address="${loc.address}" style="margin-top:2px;">
                📍 ${loc.address} <span style="font-size:0.8em; color:#999;">(클릭하여 복사)</span>
            </div>`;
        }
        if (loc.memo) {
            html += `<div style="margin-top:2px; font-size:0.9em; color:#555;">📝 ${loc.memo}</div>`;
        }
        html += `</div>`;
    }

    if (toVal && MEM_LOCATIONS[toVal]) {
        const loc = MEM_LOCATIONS[toVal];
        html += `<div>
            <span style="font-weight:bold; color:#dc3545;">[하차] ${toVal}</span>`;
        if (loc.address) {
            html += `<div class="address-clickable" data-address="${loc.address}" style="margin-top:2px;">
                📍 ${loc.address} <span style="font-size:0.8em; color:#999;">(클릭하여 복사)</span>
            </div>`;
        }
        if (loc.memo) {
            html += `<div style="margin-top:2px; font-size:0.9em; color:#555;">📝 ${loc.memo}</div>`;
        }
        html += `</div>`;
    }

    displayEl.innerHTML = html;
    if (html !== '') {
        displayEl.style.display = 'block';
    } else {
        displayEl.style.display = 'none';
    }
}

function getFormDataWithoutTime() {
    return {
        type: document.getElementById('type').value,
        from: document.getElementById('from-center').value.trim(),
        to: document.getElementById('to-center').value.trim(),
        distance: parseFloat(document.getElementById('manual-distance').value) || 0,
        cost: Math.round((parseFloat(document.getElementById('cost').value) || 0) * 10000),
        income: Math.round((parseFloat(document.getElementById('income').value) || 0) * 10000),
        expenseItem: document.getElementById('expense-item')?.value || '',
        supplyItem: document.getElementById('supply-item')?.value || '',
        supplyMileage: document.getElementById('supply-mileage')?.value || '',
        liters: document.getElementById('fuel-liters')?.value || 0,
        unitPrice: document.getElementById('fuel-unit-price')?.value || 0,
        brand: document.getElementById('fuel-brand')?.value || ''
    };
}

function resetForm() {
    document.getElementById('record-form')?.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('edit-mode-indicator')?.classList.add('hidden');
    document.getElementById('date').value = getTodayString();
    document.getElementById('time').value = getCurrentTimeString();
    document.getElementById('date').disabled = false;
    document.getElementById('time').disabled = false;
    const displayEl = document.getElementById('address-display');
    if(displayEl) { displayEl.innerHTML = ''; displayEl.style.display = 'none'; }
    toggleUI();
}

function renderFrequentLocationButtons() {
    const fromContainer = document.getElementById('top-from-centers');
    const toContainer = document.getElementById('top-to-centers');
    if (!fromContainer || !toContainer) return;

    const fromCounts = {}, toCounts = {};
    MEM_RECORDS.forEach(r => {
        if (r.type === '화물운송' || r.type === '대기') {
            if (r.from) fromCounts[r.from] = (fromCounts[r.from] || 0) + 1;
            if (r.to) toCounts[r.to] = (toCounts[r.to] || 0) + 1;
        }
    });

    const buildButtons = (data, container, targetInputId) => {
        container.innerHTML = '';
        const sorted = Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,5);
        if (sorted.length === 0) container.style.display = 'none'; 
        else container.style.display = 'grid'; 
        sorted.forEach(([name]) => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'quick-loc-btn'; btn.textContent = name;
            btn.onclick = () => {
                const input = document.getElementById(targetInputId);
                if(input) { input.value = name; input.dispatchEvent(new Event('input')); }
            };
            container.appendChild(btn);
        });
    };
    buildButtons(fromCounts, fromContainer, 'from-center');
    buildButtons(toCounts, toContainer, 'to-center');
}

// ==========================================
// 4. STATS FUNCTIONS
// ==========================================
function calculateTotalDuration(records) {
    const sorted = [...records].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    let totalMinutes = 0;
    if (sorted.length < 2) return '0h 0m';
    for (let i = 1; i < sorted.length; i++) {
        const curr = new Date(`${sorted[i].date}T${sorted[i].time}`);
        const prev = new Date(`${sorted[i-1].date}T${sorted[i-1].time}`);
        if (sorted[i-1].type !== '운행종료') {
            totalMinutes += (curr - prev) / 60000;
        }
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
}

function createSummaryHTML(title, records) {
    const validRecords = records.filter(r => r.type !== '운행취소' && r.type !== '운행종료');
    let totalIncome = 0, totalExpense = 0, totalDistance = 0, totalTripCount = 0;
    let totalFuelCost = 0, totalFuelLiters = 0;
    
    validRecords.forEach(r => {
        totalIncome += safeInt(r.income);
        totalExpense += safeInt(r.cost);
        if (r.type === '주유소') { 
            totalFuelCost += safeInt(r.cost); 
            totalFuelLiters += safeFloat(r.liters); 
        }
        if (['화물운송'].includes(r.type)) { 
            totalDistance += safeFloat(r.distance); 
            totalTripCount++; 
        }
    });

    const netIncome = totalIncome - totalExpense;
    
    const metrics = [
        { label: '수입', value: formatToManwon(totalIncome), unit: ' 만원', className: 'income' },
        { label: '지출', value: formatToManwon(totalExpense), unit: ' 만원', className: 'cost' },
        { label: '정산', value: formatToManwon(netIncome), unit: ' 만원', className: 'net' },
        { label: '운행거리', value: totalDistance.toFixed(1), unit: ' km' },
        { label: '운행건수', value: totalTripCount, unit: ' 건' },
        { label: '주유금액', value: formatToManwon(totalFuelCost), unit: ' 만원', className: 'cost' },
        { label: '주유리터', value: totalFuelLiters.toFixed(2), unit: ' L' },
    ];
    let itemsHtml = metrics.map(m => `<div class="summary-item"><span class="summary-label">${m.label}</span><span class="summary-value ${m.className || ''} hidden">${m.value}${m.unit}</span></div>`).join('');
    return `<strong>${title}</strong><div class="summary-toggle-grid" onclick="window.toggleAllSummaryValues(this)">${itemsHtml}</div>`;
}

function displayTodayRecords(date) {
    const todayTbody = document.querySelector('#today-records-table tbody');
    const todaySummaryDiv = document.getElementById('today-summary');
    if(!todayTbody) return;
    const dayRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time) === date)
                                  .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    todayTbody.innerHTML = '';
    const displayList = dayRecords.filter(r => r.type !== '운행종료');
    displayList.forEach(r => {
        const tr = document.createElement('tr');
        tr.dataset.id = r.id; 
        let timeDisplay = r.time;
        if(r.date !== date) { timeDisplay = `<span style="font-size:0.8em; color:#888;">(익일)</span> ${r.time}`; }
        let money = '';
        const inc = safeInt(r.income);
        const cst = safeInt(r.cost);
        if(inc > 0) money += `<span class="income">+${formatToManwon(inc)}</span> `;
        if(cst > 0) money += `<span class="cost">-${formatToManwon(cst)}</span>`;
        if(money === '') money = '0'; 
        const isTransport = (r.type === '화물운송' || r.type === '대기' || r.type === '운행취소');
        if (isTransport) {
            let endTime = '진행중';
            let duration = '-';
            const idx = MEM_RECORDS.findIndex(item => item.id === r.id);
            if (idx > -1 && idx < MEM_RECORDS.length - 1) {
                const next = MEM_RECORDS[idx + 1];
                endTime = (next.date !== r.date) ? `<span style="font-size:0.8em; color:#888;">(${next.date.substring(5)})</span><br>${next.time}` : next.time;
                const startObj = new Date(`${r.date}T${r.time}`);
                const endObj = new Date(`${next.date}T${next.time}`);
                const diff = endObj - startObj;
                if (diff >= 0) {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                }
            }
            if(endTime === '진행중') tr.classList.add('row-in-progress');
            else tr.classList.add('row-completed');
            const fromLoc = MEM_LOCATIONS[r.from] || {}, toLoc = MEM_LOCATIONS[r.to] || {};
            let fromCell = `<span class="location-clickable" data-center="${(r.from||'').replace(/"/g, '&quot;')}">${r.from || ''}</span>`;
            if (fromLoc.memo) fromCell += `<span class="table-memo">${fromLoc.memo}</span>`;
            let toCell = `<span class="location-clickable" data-center="${(r.to||'').replace(/"/g, '&quot;')}">${r.to || ''}</span>`;
            if (toLoc.memo) toCell += `<span class="table-memo">${toLoc.memo}</span>`;
            let noteCell = '';
            if(r.distance) noteCell = `<span class="note">${safeFloat(r.distance)} km</span>`;
            if(r.type === '대기') noteCell = `<span class="note">대기중</span>`;
            if(r.type === '운행취소') noteCell = `<span class="note cancelled">취소됨</span>`;
            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td data-label="종료">${endTime}</td><td data-label="소요">${duration}</td><td data-label="상차">${fromCell}</td><td data-label="하차">${toCell}</td><td data-label="비고">${noteCell}</td><td data-label="금액">${money}</td>`;
        } else {
            const detail = r.expenseItem || r.supplyItem || r.brand || '';
            const content = `<span style="font-weight:bold; color:#555;">[${r.type}]</span>&nbsp;&nbsp;${detail}`;
            if(r.type === '운행종료') tr.classList.add('row-end');
            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td colspan="5" data-label="" style="color:#333;">${content}</td><td data-label="금액">${money}</td>`;
        }
        todayTbody.appendChild(tr);
    });
    if(todaySummaryDiv) todaySummaryDiv.innerHTML = createSummaryHTML('오늘의 기록 (04시 기준)', dayRecords);
}

function displayDailyRecords() {
    const yearSelect = document.getElementById('daily-year-select'), monthSelect = document.getElementById('daily-month-select');
    if(!yearSelect || !monthSelect) return;
    const year = yearSelect.value, month = monthSelect.value, selectedPeriod = `${year}-${month}`;
    const dailyTbody = document.querySelector('#daily-summary-table tbody'), dailySummaryDiv = document.getElementById('daily-summary');
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(selectedPeriod));
    if(dailyTbody) dailyTbody.innerHTML = '';
    if(dailySummaryDiv) dailySummaryDiv.innerHTML = createSummaryHTML(`${parseInt(month)}월 총계 (04시 기준)`, monthRecords);
    const recordsByDate = {};
    monthRecords.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time);
        if(!recordsByDate[statDate]) recordsByDate[statDate] = { records: [], income: 0, expense: 0, fuel: 0, distance: 0, tripCount: 0 };
        recordsByDate[statDate].records.push(r);
    });
    Object.keys(recordsByDate).sort().reverse().forEach(date => {
        const dayData = recordsByDate[date];
        let inc = 0, exp = 0, fuel = 0, dist = 0, count = 0;
        dayData.records.forEach(r => {
            if(r.type === '주유소') fuel += safeInt(r.cost);
            else if (r.type !== '운행종료' && r.type !== '운행취소') { inc += safeInt(r.income); exp += safeInt(r.cost); }
            if(r.type === '화물운송') { dist += safeFloat(r.distance); count++; }
        });
        const tr = document.createElement('tr');
        if(date === getTodayString()) tr.style.fontWeight = 'bold';
        tr.innerHTML = `<td data-label="일">${parseInt(date.substring(8,10))}일</td><td data-label="수입"><span class="income">${formatToManwon(inc)}</span></td><td data-label="지출"><span class="cost">${formatToManwon(exp)}</span></td><td data-label="주유"><span class="cost">${formatToManwon(fuel)}</span></td><td data-label="정산"><strong>${formatToManwon(inc-exp-fuel)}</strong></td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(dayData.records.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type)))}</td><td data-label="관리"><button class="edit-btn" onclick="window.viewDateDetails('${date}')">상세</button></td>`;
        if(dailyTbody) dailyTbody.appendChild(tr);
    });
}

function displayWeeklyRecords() {
    const yearSelect = document.getElementById('weekly-year-select'), monthSelect = document.getElementById('weekly-month-select');
    if(!yearSelect || !monthSelect) return;
    const year = yearSelect.value, month = monthSelect.value, selectedPeriod = `${year}-${month}`;
    const weeklyTbody = document.querySelector('#weekly-summary-table tbody'), weeklySummaryDiv = document.getElementById('weekly-summary');
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(selectedPeriod));
    if(weeklyTbody) weeklyTbody.innerHTML = '';
    if(weeklySummaryDiv) weeklySummaryDiv.innerHTML = createSummaryHTML(`${parseInt(month)}월 주별`, monthRecords);
    const weeks = {};
    monthRecords.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time), d = new Date(statDate);
        const w = Math.ceil((d.getDate() + (new Date(d.getFullYear(), d.getMonth(), 1).getDay())) / 7);
        if(!weeks[w]) weeks[w] = [];
        weeks[w].push(r);
    });
    Object.keys(weeks).forEach(w => {
        const data = weeks[w];
        let inc = 0, exp = 0, fuel = 0, dist = 0, count = 0;
        data.forEach(r => { 
            if(r.type === '주유소') fuel += safeInt(r.cost);
            else if(r.type!=='운행종료'&&r.type!=='운행취소'){ inc+=safeInt(r.income); exp+=safeInt(r.cost); } 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);count++;} 
        });
        const dates = data.map(r => new Date(getStatisticalDate(r.date, r.time)).getDate());
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="주차">${w}주차</td><td data-label="기간">${Math.min(...dates)}일~${Math.max(...dates)}일</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="주유">${formatToManwon(fuel)}</td><td data-label="정산">${formatToManwon(inc-exp-fuel)}</td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(data.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type)))}</td>`;
        if(weeklyTbody) weeklyTbody.appendChild(tr);
    });
}

function displayMonthlyRecords() {
    const yearSelect = document.getElementById('monthly-year-select');
    if(!yearSelect) return;
    const year = yearSelect.value, monthlyTbody = document.querySelector('#monthly-summary-table tbody'), monthlyYearlySummaryDiv = document.getElementById('monthly-yearly-summary');
    const yearRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(year));
    if(monthlyYearlySummaryDiv) monthlyYearlySummaryDiv.innerHTML = createSummaryHTML(`${year}년`, yearRecords);
    if(monthlyTbody) monthlyTbody.innerHTML = '';
    const months = {};
    yearRecords.forEach(r => { 
        const m = getStatisticalDate(r.date, r.time).substring(0,7); 
        if(!months[m]) months[m]={records:[]}; 
        months[m].records.push(r); 
    });
    Object.keys(months).sort().reverse().forEach(m => {
        const data = months[m];
        let inc=0,exp=0,fuel=0,dist=0,count=0;
         data.records.forEach(r => { 
            if(r.type === '주유소') fuel += safeInt(r.cost);
            else if(r.type!=='운행종료'&&r.type!=='운행취소'){ inc+=safeInt(r.income); exp+=safeInt(r.cost); } 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);count++;} 
        });
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="월">${parseInt(m.substring(5))}월</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="주유">${formatToManwon(fuel)}</td><td data-label="정산">${formatToManwon(inc-exp-fuel)}</td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(data.records.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type)))}</td>`;
        if(monthlyTbody) monthlyTbody.appendChild(tr);
    });
}

function displayCurrentMonthData() {
    let checkDate = new Date();
    if(checkDate.getHours() < 4) checkDate.setDate(checkDate.getDate() - 1);
    const currentPeriod = checkDate.toISOString().slice(0, 7); 
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(currentPeriod) && r.type !== '운행취소' && r.type !== '운행종료'); 
    
    let inc = 0, exp = 0, count = 0, dist = 0, liters = 0; 
    monthRecords.forEach(r => { 
        inc += safeInt(r.income); exp += safeInt(r.cost); 
        if(r.type === '화물운송') { count++; dist += safeFloat(r.distance); } 
        if(r.type === '주유소') liters += safeFloat(r.liters); 
    }); 
    
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
    setTxt('current-month-title', `${parseInt(currentPeriod.split('-')[1])}월 실시간 요약 (04시 기준)`);
    setTxt('current-month-operating-days', `${new Set(monthRecords.map(r => getStatisticalDate(r.date, r.time))).size} 일`); 
    setTxt('current-month-trip-count', `${count} 건`); 
    setTxt('current-month-total-mileage', `${dist.toFixed(1)} km`); 
    setTxt('current-month-income', `${formatToManwon(inc)} 만원`); 
    setTxt('current-month-expense', `${formatToManwon(exp)} 만원`); 
    setTxt('current-month-net-income', `${formatToManwon(inc-exp)} 만원`); 
    setTxt('current-month-avg-economy', `${liters > 0 && dist > 0 ? (dist/liters).toFixed(2) : 0} km/L`); 
    setTxt('current-month-cost-per-km', `${dist > 0 ? Math.round(exp/dist).toLocaleString() : 0} 원`); 
    
    const limit = parseFloat(localStorage.getItem("fuel_subsidy_limit")) || 0; 
    const pct = limit > 0 ? Math.min(100, 100 * liters / limit).toFixed(1) : 0; 
    const subSum = document.getElementById('subsidy-summary');
    if(subSum) subSum.innerHTML = `<div class="progress-label">월 한도: ${limit.toLocaleString()} L | 사용: ${liters.toFixed(1)} L | 잔여: ${(limit-liters).toFixed(1)} L</div><div class="progress-bar-container"><div class="progress-bar progress-bar-used" style="width: ${pct}%;"></div></div>`; 
}

function displayCumulativeData() {
    const records = MEM_RECORDS.filter(r => r.type !== '운행취소' && r.type !== '운행종료');
    let inc = 0, exp = 0, count = 0, dist = 0, liters = 0;
    records.forEach(r => {
        inc += safeInt(r.income); exp += safeInt(r.cost);
        if(r.type === '주유소') liters += safeFloat(r.liters);
        if(r.type === '화물운송') { count++; dist += safeFloat(r.distance); }
    });
    
    const totalDist = dist + (parseFloat(localStorage.getItem("mileage_correction")) || 0);
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
    setTxt('cumulative-operating-days', `${new Set(records.map(r => getStatisticalDate(r.date, r.time))).size} 일`);
    setTxt('cumulative-trip-count', `${count} 건`);
    setTxt('cumulative-total-mileage', `${Math.round(totalDist).toLocaleString()} km`);
    setTxt('cumulative-income', `${formatToManwon(inc)} 만원`);
    setTxt('cumulative-expense', `${formatToManwon(exp)} 만원`);
    setTxt('cumulative-net-income', `${formatToManwon(inc-exp)} 만원`);
    setTxt('cumulative-avg-economy', `${liters > 0 && totalDist > 0 ? (totalDist/liters).toFixed(2) : 0} km/L`);
    setTxt('cumulative-cost-per-km', `${totalDist > 0 ? Math.round(exp/totalDist).toLocaleString() : 0} 원`);
    renderMileageSummary();
}

function renderMileageSummary(period = 'monthly') {
    const validRecords = MEM_RECORDS.filter(r => ['화물운송'].includes(r.type));
    let summaryData = {};
    if (period === 'monthly') {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            summaryData[d.toISOString().slice(0, 7)] = 0;
        }
        validRecords.forEach(r => { 
            const k = getStatisticalDate(r.date, r.time).substring(0, 7); 
            if (summaryData.hasOwnProperty(k)) summaryData[k]++; 
        });
    }
    let h = '';
    for (const k in summaryData) h += `<div class="metric-card"><span class="metric-label">${k}</span><span class="metric-value">${summaryData[k]} 건</span></div>`;
    if(document.getElementById('mileage-summary-cards')) document.getElementById('mileage-summary-cards').innerHTML = h;
}

let displayedSubsidyCount = 0;
function displaySubsidyRecords(append = false) {
    const list = document.getElementById('subsidy-records-list'), fuelRecords = MEM_RECORDS.filter(r => r.type === '주유소').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    if (!append) { displayedSubsidyCount = 0; if(list) list.innerHTML = ''; }
    if (!fuelRecords.length) { if(list) list.innerHTML = '<p style="text-align:center;">내역 없음</p>'; return; }
    fuelRecords.slice(displayedSubsidyCount, displayedSubsidyCount + 10).forEach(r => {
        const div = document.createElement('div'); div.className = 'center-item';
        div.innerHTML = `<div class="info"><span>${r.date} (${r.brand || '기타'})</span><strong>${formatToManwon(safeInt(r.cost))} 만원</strong></div><div style="display:flex; justify-content:space-between; font-size:0.9em;"><span>${parseFloat(r.liters).toFixed(2)} L</span><span>단가: ${r.unitPrice} 원</span></div>`;
        if(list) list.appendChild(div);
    });
    displayedSubsidyCount += 10;
}

function generatePrintView(year, month, period, isDetailed) {
    const sDay = period === 'second' ? 16 : 1, eDay = period === 'first' ? 15 : 31;
    const periodStr = period === 'full' ? '1일 ~ 말일' : `${sDay}일 ~ ${eDay===15?15:'말일'}일`;

    const target = MEM_RECORDS.filter(r => { 
        const statDate = getStatisticalDate(r.date, r.time), d = new Date(statDate); 
        return statDate.startsWith(`${year}-${month}`) && d.getDate() >= sDay && d.getDate() <= eDay && r.type !== '운행종료'; 
    }).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
    
    const transportList = target.filter(r => ['화물운송', '대기', '운행취소'].includes(r.type));
    const fuelList = target.filter(r => r.type === '주유소');
    const expenseList = target.filter(r => ['지출', '소모품'].includes(r.type));
    const incomeList = target.filter(r => r.type === '수입');

    let transInc = 0, transExp = 0, transDist = 0;
    transportList.forEach(r => { transInc += safeInt(r.income); transExp += safeInt(r.cost); transDist += safeFloat(r.distance); });
    
    let fuelTotalCost = 0, fuelTotalSubsidy = 0;
    fuelList.forEach(r => { fuelTotalCost += safeInt(r.cost); fuelTotalSubsidy += safeInt(r.subsidy); });
    
    let genExp = 0; expenseList.forEach(r => genExp += safeInt(r.cost));
    let genInc = 0; incomeList.forEach(r => genInc += safeInt(r.income));

    const totalRevenue = transInc + genInc;
    const totalSpend = transExp + genExp;
    const fuelNetCost = fuelTotalCost - fuelTotalSubsidy;
    const finalProfit = totalRevenue - totalSpend - fuelNetCost;

    const w = window.open('','_blank');
    let h = `
    <html>
    <head>
        <title>운송기록_${year}${month}</title>
        <style>
            body { font-family: -apple-system, sans-serif; margin: 30px; line-height: 1.6; color: #333; }
            h2 { font-size: 24px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; table-layout: fixed; border-top: 1px solid #333; }
            th, td { border: 1px solid #ddd; padding: 7px; text-align: center; }
            th { background: #f8f9fa; font-weight: bold; }
            .summary { padding: 10px 0; margin-bottom: 30px; }
            .summary p { margin: 8px 0; font-weight: bold; font-size: 14px; }
            .dashed-line { border-top: 1px dashed #ccc; margin: 15px 0; }
            .thick-line { border-top: 2px solid #333; margin: 15px 0; }
            .txt-blue { color: #007bff; }
            .txt-red { color: #dc3545; }
            .txt-green { color: #28a745; font-size: 1.5em; margin-top: 15px !important; }
            .date-border { border-top: 2.5px solid #000 !important; }
            h3 { border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 40px; font-size: 18px; }
            .left { text-align: left; padding-left: 10px; }
            .total-row { background: #f2f2f2; font-weight: bold; }
        </style>
    </head>
    <body>
        <h2>${year}년 ${month}월 ${periodStr} 운송 기록 (04시 기준)</h2>
        
        <div class="summary">
            <p>[요약] 근무일: ${new Set(transportList.map(r => getStatisticalDate(r.date, r.time))).size}일 | 운행건수: ${transportList.length}건 | 운행거리: ${transDist.toFixed(1)}km</p>
            <div class="dashed-line"></div>
            <p class="txt-blue">[ + ] 총 수입: ${totalRevenue.toLocaleString()} 원 (운송: ${transInc.toLocaleString()} + 기타: ${genInc.toLocaleString()})</p>
            <p class="txt-red">[ - ] 총 지출: ${totalSpend.toLocaleString()} 원 (운송지출: ${transExp.toLocaleString()} + 일반지출: ${genExp.toLocaleString()})</p>
            <p class="txt-red">[ - ] 실 주유비: ${fuelNetCost.toLocaleString()} 원 (주유금액: ${fuelTotalCost.toLocaleString()} - 보조금: ${fuelTotalSubsidy.toLocaleString()})</p>
            <div class="thick-line"></div>
            <p class="txt-green">[ = ] 최종 순수익: ${finalProfit.toLocaleString()} 원</p>
        </div>

        <h3>1. 운송 내역</h3>
        <table>
            <thead>
                <tr>
                    <th style="width:10%;">날짜</th>
                    <th style="width:28%;">상차지</th>
                    <th style="width:28%;">하차지</th>
                    <th style="width:17%;">내용</th>
                    <th style="width:17%;">거리</th>
                </tr>
            </thead>
            <tbody>`;
            
    let lastDate = "";
    transportList.forEach(r => {
        const currentDate = getStatisticalDate(r.date, r.time);
        const borderClass = (lastDate !== "" && lastDate !== currentDate) ? 'class="date-border"' : '';
        lastDate = currentDate;

        let distDisplay = "-";
        if(r.distance > 0) distDisplay = r.distance.toFixed(0);

        h += `<tr ${borderClass}>
                <td>${currentDate.substring(5)}</td>
                <td class="left">${r.from||''}</td>
                <td class="left">${r.to||''}</td>
                <td>${r.type === '운행취소' ? '취소' : (r.type === '대기' ? '대기' : '화물운송')}</td>
                <td>${distDisplay}</td>
              </tr>`;
    });
    
    h += `</tbody></table>`;

    h += `<h3>2. 주유 및 정비 내역</h3>`;
    if(fuelList.length > 0) {
        h += `<table><thead><tr><th>날짜</th><th>주유리터</th><th>주유단가</th><th>주유금액</th><th>보조금액</th><th>실결제금액</th></tr></thead><tbody>`;
        
        let sumLiters = 0;
        let sumCost = 0;
        let sumSub = 0;

        fuelList.forEach(f => {
            const liters = safeFloat(f.liters);
            const cost = safeInt(f.cost);
            const sub = safeInt(f.subsidy);
            
            sumLiters += liters;
            sumCost += cost;
            sumSub += sub;

            h += `<tr>
                <td>${getStatisticalDate(f.date, f.time).substring(5)}</td>
                <td>${liters.toFixed(2)} L</td>
                <td>${safeInt(f.unitPrice).toLocaleString()} 원</td>
                <td>${cost.toLocaleString()} 원</td>
                <td class="txt-red">-${sub.toLocaleString()} 원</td>
                <td><strong>${(cost - sub).toLocaleString()} 원</strong></td>
            </tr>`;
        });

        const avgPrice = sumLiters > 0 ? Math.round(sumCost / sumLiters) : 0;

        h += `<tr class="total-row">
            <td>합계(${fuelList.length}회)</td>
            <td>${sumLiters.toFixed(2)} L</td>
            <td>${avgPrice.toLocaleString()} 원</td>
            <td>${sumCost.toLocaleString()} 원</td>
            <td class="txt-red">-${sumSub.toLocaleString()} 원</td>
            <td>${(sumCost - sumSub).toLocaleString()} 원</td>
        </tr>`;

        h += `</tbody></table>`;
    } else { h += `<p style="font-size:12px; color:#666;">내역 없음</p>`; }

    h += `<h3>3. 지출 내역</h3>`;
    if(expenseList.length > 0) {
        h += `<table><thead><tr><th style="width:15%;">날짜</th><th style="width:55%;">내용 (적요)</th><th style="width:30%;">지출금액</th></tr></thead><tbody>`;
        expenseList.forEach(e => {
            h += `<tr>
                <td>${getStatisticalDate(e.date, e.time).substring(5)}</td>
                <td class="left">${e.expenseItem || e.supplyItem || e.type}</td>
                <td>${safeInt(e.cost).toLocaleString()} 원</td>
            </tr>`;
        });
        h += `</tbody></table>`;
    } else { h += `<p style="font-size:12px; color:#666;">내역 없음</p>`; }

    h += `<h3>4. 수입 내역</h3>`;
    if(incomeList.length > 0) {
        h += `<table><thead><tr><th style="width:15%;">날짜</th><th style="width:55%;">내용 (적요)</th><th style="width:30%;">수입금액</th></tr></thead><tbody>`;
        incomeList.forEach(i => {
            h += `<tr>
                <td>${getStatisticalDate(i.date, i.time).substring(5)}</td>
                <td class="left">${i.expenseItem || i.type}</td>
                <td>${safeInt(i.income).toLocaleString()} 원</td>
            </tr>`;
        });
        h += `</tbody></table>`;
    } else { h += `<p style="font-size:12px; color:#666;">내역 없음</p>`; }

    h += `<div style="text-align:center; margin-top:50px;"><button onclick="window.print()" style="padding:10px 40px; font-size:16px; cursor:pointer; font-weight:bold;">인쇄하기</button></div>
    </body></html>`;
    w.document.write(h); w.document.close();
}

// ==========================================
// 5. SMS PARSER
// ==========================================
function parseSmsText() {
    const inputEl = document.getElementById('sms-input');
    const input = inputEl ? inputEl.value : "";
    if (!input.trim()) {
        showToast("분석할 문자를 입력해주세요.");
        return;
    }

    const resultsDiv = document.getElementById('sms-parse-results');
    if(!resultsDiv) return;
    
    resultsDiv.innerHTML = "";
    resultsDiv.classList.remove('hidden');

    const lines = input.split('\n').filter(line => {
        const l = line.trim();
        return l.length > 5 && !l.includes("Web발신");
    });

    const sortedCenters = [...MEM_CENTERS].sort((a, b) => b.length - a.length);

    lines.forEach((line, lineIdx) => {
        let cleaned = line.trim();
        
        // 노이즈 제거
        cleaned = cleaned.replace(/\d{1,2}월\s*\d{1,2}일/g, " ");
        cleaned = cleaned.replace(/\d{1,2}[\/\-\.]\d{1,2}/g, " "); 
        cleaned = cleaned.replace(/배차표|운송장/g, " "); 
        cleaned = cleaned.replace(/\d+층\s*->\s*\d+층/g, " ");
        cleaned = cleaned.replace(/\d{1,2}:\d{2}/g, " ");
        cleaned = cleaned.replace(/[1-9][0-9]?T/g, " ");

        let matches = [];
        let searchQueue = cleaned.toUpperCase();

        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            let pos = searchQueue.indexOf(centerUpper);
            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                searchQueue = searchQueue.substring(0, pos) + " ".repeat(center.length) + searchQueue.substring(pos + center.length);
            }
        });

        matches.sort((a, b) => a.index - b.index);

        let finalFrom = matches[0] ? matches[0].name : "";
        let finalTo = matches[1] ? matches[1].name : "";

        if (!finalFrom || !finalTo) {
            const words = cleaned.split(/\s+/).filter(w => w.trim().length >= 2);
            if (!finalFrom) finalFrom = words[0] || "";
            if (!finalTo) finalTo = words[1] || "";
        }

        if(!finalFrom && !finalTo) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = "sms-item-card";
        // 스타일은 style.css에서 제어 (float 해제 등 포함)

        const buildLocInput = (label, id, value, color) => {
            const locInfo = MEM_LOCATIONS[value];
            const needsInfo = !locInfo || !locInfo.address; 
            
            // [수정] list="center-list" 추가하여 자동완성 지원
            // [수정] oninput 이벤트 추가하여 선택 시 주소 자동 입력
            return `
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:0.75em; color:#666; font-weight:bold;">${label}</span>
                    <input type="text" id="${id}-name" value="${value}" list="center-list"
                        oninput="window.handleSmsNameInput(this, '${id}-addr', '${id}-memo')"
                        style="border:1px solid ${color}; border-radius:4px; padding:6px; font-weight:bold; color:${color}; font-size:0.95em;">
                    ${needsInfo ? `
                        <input type="text" id="${id}-addr" placeholder="주소 정보 없음(필수)" 
                            style="border:1px solid #ddd; border-radius:4px; padding:4px; font-size:0.8em; background:#fff0f0;">
                        <input type="text" id="${id}-memo" placeholder="메모" 
                            style="border:1px solid #ddd; border-radius:4px; padding:4px; font-size:0.8em;">
                    ` : `
                        <input type="text" id="${id}-addr" value="${locInfo.address || ''}" placeholder="주소" 
                            style="border:1px solid #ddd; border-radius:4px; padding:4px; font-size:0.8em; background:#f9f9f9;">
                        <input type="text" id="${id}-memo" value="${locInfo.memo || ''}" placeholder="메모" 
                            style="border:1px solid #ddd; border-radius:4px; padding:4px; font-size:0.8em; background:#f9f9f9;">
                    `}
                </div>
            `;
        };

        // [수정] 버튼 스타일 변경 (sms-save-btn 클래스 사용)
        itemDiv.innerHTML = `
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                ${buildLocInput('상차지', `from-${lineIdx}`, finalFrom, '#007bff')}
                <div style="align-self:center; font-weight:bold; color:#ccc;">▶</div>
                ${buildLocInput('하차지', `to-${lineIdx}`, finalTo, '#dc3545')}
            </div>
            <button type="button" class="sms-save-btn"
                onclick="window.registerParsedTripWithInfo(this, ${lineIdx})">
                저장
            </button>
        `;
        resultsDiv.appendChild(itemDiv);
    });
}

// [추가] SMS 분석 카드에서 이름 입력 시 주소/메모 자동 채우기
function handleSmsNameInput(input, addrId, memoId) {
    const val = input.value.trim();
    const loc = MEM_LOCATIONS[val];
    const addrInput = document.getElementById(addrId);
    const memoInput = document.getElementById(memoId);

    if (loc && addrInput && memoInput) {
        addrInput.value = loc.address || '';
        memoInput.value = loc.memo || '';
        addrInput.style.backgroundColor = '#f9f9f9'; // 기존 정보 있음 표시
    } else if (addrInput) {
        // 정보 없으면 초기화 및 필수 표시 색상
        addrInput.value = '';
        if(memoInput) memoInput.value = '';
        addrInput.style.backgroundColor = '#fff0f0';
    }
}

function registerParsedTripWithInfo(btn, lineIdx) {
    const fromName = document.getElementById(`from-${lineIdx}-name`).value.trim();
    const toName = document.getElementById(`to-${lineIdx}-name`).value.trim();
    
    const fromAddr = document.getElementById(`from-${lineIdx}-addr`)?.value.trim();
    const fromMemo = document.getElementById(`from-${lineIdx}-memo`)?.value.trim();
    
    const toAddr = document.getElementById(`to-${lineIdx}-addr`)?.value.trim();
    const toMemo = document.getElementById(`to-${lineIdx}-memo`)?.value.trim();

    if (!fromName || !toName) {
        alert("상/하차지 이름을 입력해주세요.");
        return;
    }

    // [수정] 주소 필수 검증 로직 추가
    if (!fromAddr || !toAddr) {
        alert("주소가 없는 상/하차지는 등록할 수 없습니다.\n주소를 입력해주세요.");
        return;
    }

    // 주소 정보 업데이트 (기존 로직 유지)
    if (fromAddr || fromMemo) updateLocationData(fromName, fromAddr, fromMemo);
    if (toAddr || toMemo) updateLocationData(toName, toAddr, toMemo);

    const key = `${fromName}-${toName}`;
    const savedIncome = MEM_FARES[key] || 0;
    const savedDistance = MEM_DISTANCES[key] || 0;

    addRecord({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: getTodayString(),
        time: getCurrentTimeString(), 
        type: "화물운송",
        from: fromName, 
        to: toName, 
        distance: savedDistance, 
        income: savedIncome,
        cost: 0, liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    });
    
    btn.disabled = true;
    btn.textContent = "완료";
    btn.style.background = "#bdc3c7";
    const card = btn.closest('.sms-item-card');
    card.style.background = "#f8f9fa";
    card.style.opacity = "0.7";
    card.style.border = "1px solid #ddd";

    showToast(`${fromName} → ${toName} 저장됨`);
    
    if (window.updateAllDisplays) window.updateAllDisplays();
}

async function readLatestSMS() {
    try {
        if (typeof CapacitorSmsReader === 'undefined' && window.CapacitorSmsReader) {
        }
        if (typeof CapacitorSmsReader === 'undefined') {
            console.warn("CapacitorSmsReader plugin not found. Running in browser mode?");
            alert("SMS 플러그인을 찾을 수 없습니다 (브라우저 모드)");
            return;
        }
        const perm = await CapacitorSmsReader.requestReadPermission();
        if (!perm.granted) {
          alert('SMS 읽기 권한이 필요합니다.');
          return;
        }
        const result = await CapacitorSmsReader.getSMS({
          max: 1,
          inbox: true,
          sent: false,
        });
        if (result && result.messages && result.messages.length > 0) {
          const msg = result.messages[0];
          const smsInput = document.getElementById('sms-input');
          if (smsInput) {
              smsInput.value = msg.body || '';
              // 내용이 들어갔으니 높이 조절 트리거
              autoResizeTextarea(smsInput);
          }
          parseSmsText();
        } else {
          alert('읽을 수 있는 최근 문자가 없습니다.');
        }
      } catch (e) {
        console.error('SMS 읽기 실패', e);
        alert('SMS 읽기 중 오류가 발생했습니다.');
      }
}

// [추가] Textarea 높이 자동 조절 함수
function autoResizeTextarea(element) {
    element.style.height = 'auto';
    element.style.height = (element.scrollHeight) + 'px';
}

// ==========================================
// 6. DATE CONTROLS
// ==========================================
function moveDate(offset, updateCallback) {
    const picker = document.getElementById('today-date-picker');
    if (!picker || !picker.value) return;
    const parts = picker.value.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    dateObj.setDate(dateObj.getDate() + offset);
    
    // ISO format YYYY-MM-DD
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    
    picker.value = `${y}-${m}-${d}`;
    if(updateCallback) updateCallback();
}

function changeDateSelect(yId, mId, delta, updateCallback) {
    const yEl = document.getElementById(yId);
    const mEl = document.getElementById(mId);
    if(!yEl || !mEl) return;
    const d = new Date(parseInt(yEl.value), parseInt(mEl.value) - 1 + delta, 1);
    yEl.value = d.getFullYear();
    mEl.value = String(d.getMonth() + 1).padStart(2, '0');
    if(updateCallback) updateCallback();
}

// ==========================================
// 7. MAIN CONTROLLER & EVENTS
// ==========================================
function updateAllDisplays() {
    const picker = document.getElementById('today-date-picker');
    if (!picker) return;
    
    const targetDate = picker.value;
    
    displayTodayRecords(targetDate);
    displayDailyRecords();
    displayWeeklyRecords();
    displayMonthlyRecords();
    renderFrequentLocationButtons();
}

// 전역 노출 (HTML onclick 핸들러용)
window.updateAllDisplays = updateAllDisplays;
window.registerParsedTripWithInfo = registerParsedTripWithInfo;
window.readLatestSMS = readLatestSMS;
window.handleSmsNameInput = handleSmsNameInput; // [추가]

window.viewDateDetails = (date) => {
    const picker = document.getElementById('today-date-picker');
    if (picker) {
        picker.value = date;
        document.querySelector('.tab-btn[data-view="today"]')?.click();
        updateAllDisplays();
    }
};
window.toggleAllSummaryValues = (container) => {
    container.classList.toggle('active');
    container.querySelectorAll('.summary-value').forEach(el => el.classList.toggle('hidden'));
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const getEl = (id) => document.getElementById(id);

    // 1. Load Data
    loadAllData();
    populateCenterDatalist();
    populateExpenseDatalist();

    // 2. Set Default DateTime
    const todayStr = getTodayString();
    const nowTime = getCurrentTimeString();
    if(getEl('date')) getEl('date').value = todayStr;
    if(getEl('time')) getEl('time').value = nowTime;
    if(getEl('today-date-picker')) getEl('today-date-picker').value = todayStr;

    // 3. Init Date Selects
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let i = 0; i < 5; i++) yearOptions.push(`<option value="${currentYear - i}">${currentYear - i}년</option>`);
    
    ['daily-year-select', 'weekly-year-select', 'monthly-year-select', 'print-year-select'].forEach(id => {
        const el = getEl(id);
        if (el) el.innerHTML = yearOptions.join('');
    });

    const monthOptions = [];
    for (let i = 1; i <= 12; i++) monthOptions.push(`<option value="${i.toString().padStart(2, '0')}">${i}월</option>`);
    
    ['daily-month-select', 'weekly-month-select', 'print-month-select'].forEach(id => {
        const el = getEl(id);
        if (el) {
            el.innerHTML = monthOptions.join('');
            el.value = (new Date().getMonth() + 1).toString().padStart(2, '0');
        }
    });

    // 4. Register Event Listeners
    
    // (1) Settings Navigation
    const settingsBtn = getEl('go-to-settings-btn');
    const backBtn = getEl('back-to-main-btn');
    const mainPage = getEl('main-page');
    const settingsPage = getEl('settings-page');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            mainPage.classList.add("hidden");
            settingsPage.classList.remove("hidden");
            settingsBtn.classList.add("hidden");
            backBtn.classList.remove("hidden");
            displayCumulativeData();
            displayCurrentMonthData();
            displaySubsidyRecords();
            displayCenterList();
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            mainPage.classList.remove("hidden");
            settingsPage.classList.add("hidden");
            settingsBtn.classList.remove("hidden");
            backBtn.classList.add("hidden");
            updateAllDisplays();
        });
    }

    // (2) Global Click Delegation
    document.addEventListener('click', (e) => {
        const toggleLegend = e.target.closest('.mobile-toggle-legend');
        const toggleHeader = e.target.closest('.collapsible-header');
        
        if (toggleLegend) {
            const bodyId = toggleLegend.dataset.target;
            const body = getEl(bodyId);
            if (body) {
                toggleLegend.classList.toggle('active');
                body.classList.toggle('active');
            }
        }
        
        if (toggleHeader) {
            const body = toggleHeader.nextElementSibling;
            if (body && body.classList.contains('collapsible-body')) {
                toggleHeader.classList.toggle("active");
                body.classList.toggle("hidden");
                if (!body.classList.contains('hidden')) {
                    if (toggleHeader.id === 'toggle-subsidy-management') displaySubsidyRecords(false);
                    if (toggleHeader.id === 'toggle-center-management') displayCenterList();
                }
            }
        }

        const addrTarget = e.target.closest('.address-clickable');
        if (addrTarget) {
            const addr = addrTarget.dataset.address;
            if (addr) copyTextToClipboard(addr, '주소 복사됨');
        }

        const rowTarget = e.target.closest('#today-records-table tbody tr');
        const tableLocTarget = e.target.closest('.location-clickable');
        
        if (tableLocTarget) {
            const center = tableLocTarget.getAttribute('data-center');
            const loc = MEM_LOCATIONS[center];
            if(loc && loc.address) copyTextToClipboard(loc.address, '주소 복사됨');
            else copyTextToClipboard(center, '이름 복사됨');
            return; 
        }
        
        if (rowTarget && rowTarget.dataset.id && !tableLocTarget) {
            editRecord(parseInt(rowTarget.dataset.id));
        }

        if (e.target.classList.contains('tab-btn') && e.target.parentElement.classList.contains('view-tabs')) {
            document.querySelectorAll('.view-tabs .tab-btn').forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active'));
            const view = getEl(e.target.dataset.view + "-view");
            if(view) view.classList.add("active");
            updateAllDisplays();
        }
        
        if (e.target.classList.contains('tab-btn') && e.target.parentElement.id === 'mileage-summary-controls') {
             document.querySelectorAll('#mileage-summary-controls .tab-btn').forEach(b => b.classList.remove("active"));
             e.target.classList.add("active");
             renderMileageSummary(e.target.dataset.period);
        }
    });

    // (3) Inputs
    getEl('btn-parse-sms')?.addEventListener('click', parseSmsText);
    
    // [추가] SMS 입력창 자동 조절 이벤트 연결
    const smsInput = getEl('sms-input');
    if(smsInput) {
        smsInput.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
    }

    getEl('center-search-input')?.addEventListener('input', (e) => displayCenterList(e.target.value));
    
    const handleLocationInput = () => {
        const fromIn = getEl('from-center');
        const toIn = getEl('to-center');
        const typeIn = getEl('type');
        if(!fromIn || !toIn) return;
        const from = fromIn.value.trim();
        const to = toIn.value.trim();
        const type = typeIn.value;

        if((type === '화물운송' || type === '대기') && from && to) {
            const key = `${from}-${to}`;
            const incomeEl = getEl('income');
            if(incomeEl) incomeEl.value = MEM_FARES[key] ? (MEM_FARES[key]/10000).toFixed(2) : '';
            const distEl = getEl('manual-distance');
            if(distEl) distEl.value = MEM_DISTANCES[key] || '';
            const costEl = getEl('cost');
            if(costEl) costEl.value = MEM_COSTS[key] ? (MEM_COSTS[key]/10000).toFixed(2) : '';
        }
        updateAddressDisplay();
    };

    getEl('from-center')?.addEventListener('input', handleLocationInput);
    getEl('to-center')?.addEventListener('input', handleLocationInput);
    getEl('fuel-unit-price')?.addEventListener('input', () => { 
        const p=parseFloat(getEl('fuel-unit-price').value)||0, l=parseFloat(getEl('fuel-liters').value)||0; 
        if(p&&l) getEl('cost').value=(p*l/10000).toFixed(2); 
    });
    getEl('type')?.addEventListener('change', toggleUI);

    // (4) Form Actions
    getEl('btn-register-trip')?.addEventListener('click', () => {
        const formData = getFormDataWithoutTime();
        if (formData.type === '화물운송' || formData.type === '대기') {
            if (!formData.from || !formData.to) {
                alert('상차지와 하차지를 모두 입력해주세요.');
                return;
            }
        }
        if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
        addRecord({ id: Date.now(), date: getEl('date').value, time: getEl('time').value, ...formData });
        showToast('등록되었습니다.');
        resetForm();
        updateAllDisplays();
    });

    getEl('btn-start-trip')?.addEventListener('click', () => {
        const formData = getFormDataWithoutTime();
        if (formData.type === '화물운송' || formData.type === '대기') {
            if (!formData.from || !formData.to) {
                alert('상차지와 하차지를 모두 입력해주세요.');
                return;
            }
        }
        addRecord({ id: Date.now(), date: getTodayString(), time: getCurrentTimeString(), ...formData });
        showToast('운행 시작됨');
        resetForm();
        getEl('today-date-picker').value = getStatisticalDate(getTodayString(), getCurrentTimeString());
        updateAllDisplays();
    });

    getEl('btn-end-trip')?.addEventListener('click', () => {
        addRecord({ id: Date.now(), date: getTodayString(), time: getCurrentTimeString(), type: '운행종료', distance: 0, cost: 0, income: 0 });
        showToast('운행 종료됨');
        resetForm();
        updateAllDisplays();
    });

    getEl('btn-trip-cancel')?.addEventListener('click', () => {
        const formData = getFormDataWithoutTime();
        addRecord({ id: Date.now(), date: getTodayString(), time: getCurrentTimeString(), ...formData, type: '운행취소' });
        showToast('취소 처리됨');
        resetForm();
        updateAllDisplays();
    });

    getEl('btn-save-general')?.addEventListener('click', () => {
        const formData = getFormDataWithoutTime();
        if (formData.expenseItem) updateExpenseItemData(formData.expenseItem);
        addRecord({ id: Date.now(), date: getEl('date').value, time: getEl('time').value, ...formData });
        showToast('저장되었습니다.');
        populateExpenseDatalist();
        resetForm();
        updateAllDisplays();
        if(formData.type === '주유소') displaySubsidyRecords();
    });

    // (5) Edit Actions
    getEl('btn-update-record')?.addEventListener('click', () => {
        const id = parseInt(getEl('edit-id').value);
        const index = MEM_RECORDS.findIndex(r => r.id === id);
        if (index > -1) {
            const original = MEM_RECORDS[index];
            const formData = getFormDataWithoutTime();
            if (formData.type === '화물운송' && formData.from && formData.to) {
                const key = `${formData.from}-${formData.to}`;
                if(formData.distance > 0) MEM_DISTANCES[key] = formData.distance;
                if(formData.income > 0) MEM_FARES[key] = formData.income;
            }
            MEM_RECORDS[index] = { ...original, ...formData, date: original.date, time: original.time };
            saveData();
            showToast('수정 완료');
            resetForm();
            updateAllDisplays();
        }
    });

    getEl('btn-delete-record')?.addEventListener('click', () => {
        if(confirm('정말 삭제하시겠습니까?')) {
            const id = parseInt(getEl('edit-id').value);
            removeRecord(id);
            resetForm();
            updateAllDisplays();
        }
    });

    getEl('btn-cancel-edit')?.addEventListener('click', resetForm);
    getEl('btn-edit-start-trip')?.addEventListener('click', () => {
        const id = parseInt(getEl('edit-id').value);
        const index = MEM_RECORDS.findIndex(r => r.id === id);
        if (index > -1) {
            MEM_RECORDS[index].date = getTodayString();
            MEM_RECORDS[index].time = getCurrentTimeString();
            saveData();
            resetForm();
            updateAllDisplays();
        }
    });
    getEl('btn-edit-end-trip')?.addEventListener('click', () => {
        addRecord({ id: Date.now(), date: getTodayString(), time: getCurrentTimeString(), type: '운행종료', distance: 0, cost: 0, income: 0 });
        resetForm();
        updateAllDisplays();
    });

    // (6) Date Navigation
    getEl('refresh-btn')?.addEventListener('click', () => { resetForm(); location.reload(); });
    getEl('today-date-picker')?.addEventListener('change', () => updateAllDisplays());
    getEl('prev-day-btn')?.addEventListener('click', () => moveDate(-1, updateAllDisplays));
    getEl('next-day-btn')?.addEventListener('click', () => moveDate(1, updateAllDisplays));

    getEl('prev-daily-btn')?.addEventListener('click', () => changeDateSelect('daily-year-select', 'daily-month-select', -1, updateAllDisplays));
    getEl('next-daily-btn')?.addEventListener('click', () => changeDateSelect('daily-year-select', 'daily-month-select', 1, updateAllDisplays));
    getEl('prev-weekly-btn')?.addEventListener('click', () => changeDateSelect('weekly-year-select', 'weekly-month-select', -1, updateAllDisplays));
    getEl('next-weekly-btn')?.addEventListener('click', () => changeDateSelect('weekly-year-select', 'weekly-month-select', 1, updateAllDisplays));
    getEl('prev-monthly-btn')?.addEventListener('click', () => {
        const yEl = getEl('monthly-year-select');
        if(yEl) { yEl.value = parseInt(yEl.value) - 1; updateAllDisplays(); }
    });
    getEl('next-monthly-btn')?.addEventListener('click', () => {
        const yEl = getEl('monthly-year-select');
        if(yEl) { yEl.value = parseInt(yEl.value) + 1; updateAllDisplays(); }
    });
    ['daily-year-select', 'daily-month-select', 'weekly-year-select', 'weekly-month-select', 'monthly-year-select'].forEach(id => {
        getEl(id)?.addEventListener('change', updateAllDisplays);
    });

    // (7) Print & Data Management
    const getPrintEls = () => ({ 
        y: getEl('print-year-select')?.value, 
        m: getEl('print-month-select')?.value 
    });

    const printActions = [
        { id: 'print-first-half-btn', p: 'first', d: false },
        { id: 'print-second-half-btn', p: 'second', d: false },
        { id: 'print-full-month-btn', p: 'full', d: false },
        { id: 'print-first-half-detail-btn', p: 'first', d: true },
        { id: 'print-second-half-detail-btn', p: 'second', d: true },
        { id: 'print-full-month-detail-btn', p: 'full', d: true }
    ];

    printActions.forEach(act => {
        getEl(act.id)?.addEventListener('click', () => {
            const config = getPrintEls();
            generatePrintView(config.y, config.m, act.p, act.d);
        });
    });

    getEl('export-json-btn')?.addEventListener('click', () => { 
        const data = { 
            records: MEM_RECORDS, 
            centers: MEM_CENTERS, 
            locations: MEM_LOCATIONS, 
            fares: MEM_FARES, 
            distances: MEM_DISTANCES, 
            costs: MEM_COSTS, 
            subsidy: localStorage.getItem('fuel_subsidy_limit'), 
            correction: localStorage.getItem('mileage_correction'), 
            expenseItems: MEM_EXPENSE_ITEMS 
        }; 
        const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); 
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(b); 
        a.download=`backup_${getTodayString()}.json`; 
        a.click(); 
    });

    getEl('import-json-btn')?.addEventListener('click', () => getEl('import-file-input')?.click());

    getEl('import-file-input')?.addEventListener('change', (e) => { 
        if(!confirm('복원하시겠습니까?')) return; 
        const r = new FileReader(); 
        r.onload = (evt) => { 
            try {
                const d = JSON.parse(evt.target.result); 
                if(d.records) localStorage.setItem('records', JSON.stringify(d.records)); 
                if(d.centers) localStorage.setItem('logistics_centers', JSON.stringify(d.centers)); 
                if(d.locations) localStorage.setItem('saved_locations', JSON.stringify(d.locations)); 
                if(d.fares) localStorage.setItem('saved_fares', JSON.stringify(d.fares));
                alert('복원완료'); location.reload(); 
            } catch(err) {
                alert('파일 형식이 잘못되었습니다.');
            }
        }; 
        r.readAsText(e.target.files[0]); 
    });

    getEl('clear-btn')?.addEventListener('click', () => { 
        if(confirm('전체데이터를 삭제하시겠습니까?')) { 
            localStorage.clear(); 
            location.reload(); 
        }
    });

    // 5. Initial Rendering
    updateAllDisplays();
    resetForm();
});