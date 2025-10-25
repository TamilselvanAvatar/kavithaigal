const paramsString = window.location.search || '';
const searchParams = new URLSearchParams(paramsString);
const paramsObject = Object.fromEntries(searchParams.entries());

const url = 'https://script.google.com/macros/s/AKfycbyc7yvsdLrRI0sr3ld7bBBtnuo3Lb_1CHcSvuglTL0ZflaNTDSGT9HAVal9YpPdZMQyaA/exec'
const KAVITHAI_DB = 'kavithaiDB';
const KAVITHAIGAL_KEY = 'kavithaigalFiles';
const KAVITHAI_CONTENT_KEY = 'kavithaiContent';
const KAVITHAI_REFRESHED_COUNT_KEY = 'refreshedCount';
const kavithaigalFileHandle = [];
const isLocal = paramsObject.isLocal || false;
const refreshCount = paramsObject.refresh || 5;
const includeDate = paramsObject.date || false;
const code = paramsObject.code || '';
const GET_KAVITHAI = 'GET_KAVITHAI';
const GET_KAVITHAIKAL = 'GET_KAVITHAIKAL';
const emoji = ['🌸', '🌼', '✨', '🌿', '🕊️', '🌺', '🌞'];
let scriptTimeout;
let previousSelectedKavithai;

// UI Elements
const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const container = document.getElementById('conatiner');
const kavithaigalFiles = document.getElementById('kavithaigalList');
const kavithaiTitle = document.getElementById('kavithaiTitle');
const kavithaiContent = document.getElementById('kavithaiContent');
const kavithaiCount = document.getElementById('kavithaiCount');
const pickBtn = document.getElementById('pickFolder');
const loader = document.getElementById('loader');


const metaData = [
  {
    color: '#FCF3EF',
  },
  {
    color: '#D5E0EBDE'
  },
  {
    color: '#A9A9A95E',
  },
  {
    color: 'rgb(182 178 178 / 32%)',
  },
  {
    color: 'rgb(226 212 187 / 50%)',
  }
]

pickBtn.hidden = true;
content.hidden = true;
container.hidden = true;

function addSpinner(tag) {
  /* 
  <div id='loader'>
    <div class='spinner'></div>
  </div>
  */
  const loaderDiv = document.createElement('div');
  const spinnerDiv = document.createElement('div');
  loaderDiv.id = 'loader';
  spinnerDiv.className = 'spinner';
  loaderDiv.appendChild(spinnerDiv);
  tag.appendChild(loaderDiv);
}

function removeSpinner(tag) {
  const loader = tag.querySelector('#loader');
  if (loader) {
    loader.remove();
  }
}


function getRandomIndex(len) {
  return Math.floor(Math.random() * len)
}

function getMataData() {
  return metaData[getRandomIndex(metaData.length)]
}

function getEmoji() {
  return ' ' + emoji[getRandomIndex(emoji.length)];
}

function setFileContent(fileName, kavithaiContentText) {
  kavithaiTitle.textContent = fileName;
  kavithaiContent.innerHTML = formatKavithai(kavithaiContentText); // preserves spaces & line breaks
  kavithaiContent.style.backgroundColor = getMataData().color;
  content.hidden = false;
  removeSpinner(container);
}

function formatKavithai(kavithai) {
  if (!kavithai) {
    return '';
  }
  let maxLen = 0;
  const kavithaiMetaData = {};
  const tempKavithai = kavithai.split('\n');
  const modifiedKavithai = tempKavithai.filter(e => {
    const isMeta = e.startsWith('#');
    const len = e.length;
    if (isMeta) {
      const meta = e?.split('=');
      kavithaiMetaData[meta?.[0]?.replace('#', '')] = meta?.[1];
    } else {
      if (maxLen < len) {
        maxLen = len;
      }
    }
    return !isMeta;
  }).join('\n');
  kavithaiTitle.textContent = (kavithaiMetaData.Title || kavithaiTitle.textContent) + getEmoji();
  const author = kavithaiMetaData.Author ?? '';
  const date = kavithaiMetaData.Date ?? '';
  const dateStr = `<b>தேதி: ${date}\n</b>`
  const emptySpace = ' '.repeat(maxLen);
  return (includeDate ? dateStr : '') + modifiedKavithai + (author && `\n\n${emptySpace}<strong><i>- ${author}</i></strong>`);
}

function loadGetScript(url) {
  const script = document.createElement('script');
  const modifiedUrl = url + (code ? `&code=${code}` : '')
  script.defer = true; // PARSE HTML COMPLETELY
  script.src = modifiedUrl + `&callback=handleExecutedScript`; // ONLY WORK FOR GET REQUEST
  script.onload = () => script.remove(); // CLEAN UP ONCE LOADED
  document.body.appendChild(script);
  scriptTimeout = setTimeout(() => {
    console.warn("Script execution timed out. Assuming network failure/offline.");
    document.body.removeChild(script);
    handleFailure();
  }, 15000); // 15 seconds timeout
}

function handleFailure(data = {}) {
  document.body.style.justifyContent = 'space-around';
  document.body.style.alignItems = 'flex-start';
  document.body.style.marginTop = '10px';
  document.body.innerHTML =
    `<div style="padding: 1rem; margin-bottom: 1rem; text-align: center; background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 0.5rem;">
      <h3 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1.125rem; color: #dc2626; border-bottom: 1px solid #fcd3d1; padding-bottom: 0.5rem;">
          ${data.isCutom ? data.title : '⚠️ Offline Mode'}
      </h3>
      <ul style="list-style: disc inside; padding-left: 0; margin: 0.75rem 0; font-size: 0.9375rem; color: #4b5563;" ${data.isCutom ? `hidden = true` : ''}>
          <li>No active internet connection detected.</li>
          <li>No previously cached kavithai is available.</li>
      </ul>
      <p style="margin-top: 1rem; padding: 0.5rem; font-weight: bold; font-size: 1rem; color: #991b1b; background-color: #fee2e2; border-radius: 0.375rem;">
          ${data.isCutom ? data.message : 'Please connect to the internet to load content.'}
      </p>
    </div>
  `;
}

// Handle Executed Script
async function handleExecutedScript(response) {
  clearTimeout(scriptTimeout);
  const responseData = response.data;
  switch (response.action) {
    case GET_KAVITHAIKAL: {
      const files = responseData;
      const modifiedFiles = files.map(f => ({ name: f.name, id: f.id, url: `${url}?action=${GET_KAVITHAI}&id=${f.id}` }));
      await saveInfoInIndexedDB(KAVITHAIGAL_KEY, KAVITHAIGAL_KEY, modifiedFiles);
      await loadKavithigalFiles(modifiedFiles);
      break;
    }
    case GET_KAVITHAI: {
      const fileName = responseData.name;
      const kavithaiContentText = responseData.content;
      setFileContent(fileName, kavithaiContentText);
      await saveInfoInIndexedDB(KAVITHAI_CONTENT_KEY, fileName, kavithaiContentText)
      break;
    }
    default: {
      handleFailure({ isCutom: true, title: 'Kavithaigal Is Not Available Now', message: 'Sorry for Inconvenience' })
      break;
    }
  }
}

// Load Local Files
async function loadLocalFileAndContentInDB(dir) {
  if (!dir) return;
  const filesDetails = [];
  for await (const entry of dir.values()) {
    if (entry.kind == 'file') {
      const fileName = entry.name;
      const file = await entry.getFile();
      const fileContent = await file.text();
      filesDetails.push({ name: fileName });
      await saveInfoInIndexedDB(KAVITHAI_CONTENT_KEY, fileName, fileContent)
    }
  }
  await saveInfoInIndexedDB(KAVITHAIGAL_KEY, KAVITHAIGAL_KEY, filesDetails);
  await loadKavithigalFiles(filesDetails)
}

// Load Kavithaigal File
async function loadKavithigalFiles(fileDetails = []) {
  removeSpinner(kavithaigalFiles);
  kavithaiCount.innerHTML = fileDetails.length;
  kavithaigalFiles.innerHTML = '';
  for (const file of fileDetails) {
    const btn = document.createElement('button');
    btn.className = 'kavithaiBtn';
    btn.textContent = file.name + getEmoji();
    btn.onclick = async () => {
      if (previousSelectedKavithai) {
        previousSelectedKavithai.classList.remove('selected');
      }
      previousSelectedKavithai = btn;
      btn.classList.add('selected');
      fetchAndSaveKavithai(file)
    };
    kavithaigalFiles.appendChild(btn);
  }
}

// Load and Save Kavithai
async function fetchAndSaveKavithai(file) {
  container.hidden = false;
  addSpinner(container);
  content.hidden = true;
  document.body.classList.add('active');
  const fileName = file.name;
  const savedKavithai = await getInfoFromIndexedDB(KAVITHAI_CONTENT_KEY, fileName);
  if (!savedKavithai) {
    loadGetScript(file.url);
  } else {
    setFileContent(fileName, savedKavithai);
  }
}

// IndexedDB Helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KAVITHAI_DB, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(KAVITHAIGAL_KEY)) {
        db.createObjectStore(KAVITHAIGAL_KEY);
      }
      if (!db.objectStoreNames.contains(KAVITHAI_CONTENT_KEY)) {
        db.createObjectStore(KAVITHAI_CONTENT_KEY);
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function refreshIndexedDB() {
  const refreshedCount = (await getInfoFromIndexedDB(KAVITHAIGAL_KEY, KAVITHAI_REFRESHED_COUNT_KEY)) || 0;
  if (refreshedCount >= refreshCount) {
    await deleteIndexedDB(KAVITHAI_DB);
  } else {
    await saveInfoInIndexedDB(KAVITHAIGAL_KEY, KAVITHAI_REFRESHED_COUNT_KEY, refreshedCount + 1);
  }
};

function deleteIndexedDB(dbName) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => {
      console.log(`✅ Database ${dbName} deleted successfully`);
      resolve(true);
    };
    req.onerror = (e) => {
      console.error(`❌ Failed to delete database ${dbName}`, e);
      reject(e);
    };
    req.onblocked = () => {
      console.warn(`⚠️ Database ${dbName} deletion is blocked (still in use)`);
    };
  })
};

async function saveInfoInIndexedDB(table, key, obj) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, 'readwrite');
    tx.objectStore(table).put(obj, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getInfoFromIndexedDB(table, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, 'readonly');
    const req = tx.objectStore(table).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Pick local folder
pickBtn.addEventListener('click', async () => {
  try {
    const resourcesDirHandle = await window.showDirectoryPicker();
    await loadLocalFileAndContentInDB(resourcesDirHandle);
  } catch (err) {
    console.error('Folder pick cancelled or failed:', err);
  }
});

// On DOM Load
window.addEventListener('DOMContentLoaded', async () => {
  addSpinner(kavithaigalFiles);
  await refreshIndexedDB();
  let savedKavithaigalFiles = await getInfoFromIndexedDB(KAVITHAIGAL_KEY, KAVITHAIGAL_KEY);
  if (!savedKavithaigalFiles && !isLocal) {
    loadGetScript(`${url}?action=${GET_KAVITHAIKAL}`);
    return;
  } else if (isLocal) {
    pickBtn.hidden = false;
  }
  await loadKavithigalFiles(savedKavithaigalFiles);
});