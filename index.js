const url = 'https://script.google.com/macros/s/AKfycbyc7yvsdLrRI0sr3ld7bBBtnuo3Lb_1CHcSvuglTL0ZflaNTDSGT9HAVal9YpPdZMQyaA/exec'
const KAVITHAI_DB = 'kavithaiDB';
const KAVITHAIGAL_KEY = 'kavithaigalFiles';
const KAVITHAI_CONTENT_KEY = 'kavithaiContent';
const KAVITHAI_REFRESHED_COUNT_KEY = 'refreshedCount';
const kavithaigalFileHandle = [];
const isLocal = false;
const refreshCount = 5;
let previousSelectedKavithai;

// UI Elements
const content = document.getElementById('content');
const kavithaigalFiles = document.getElementById('kavithaigalList');
const kavithaiTitle = document.getElementById('kavithaiTitle');
const kavithaiContent = document.getElementById('kavithaiContent');
const pickBtn = document.getElementById('pickFolder');


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

function getMataData() {
  return metaData[Math.floor(Math.random() * metaData.length)]
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
      const meta = e.split('=');
      kavithaiMetaData[meta[0].replace('#', '')] = meta[1];
    } else {
      if (maxLen < len) {
        maxLen = len;
      }
    }
    return !isMeta;
  }).join('\n');
  const author = `- ${kavithaiMetaData.Author}`;
  const emptySpace = ' '.repeat(maxLen);
  return modifiedKavithai + `\n\n${emptySpace}<strong><i>${author}</i></strong>`;
}

window.addEventListener('DOMContentLoaded', async () => {
  await refreshIndexedDB();
  let savedKavithaigalFiles = await getInfoFromIndexedDB(KAVITHAIGAL_KEY, KAVITHAIGAL_KEY);
  if (!savedKavithaigalFiles && !isLocal) {
    const files = await fetch(`${url}?action=GET_KAVITHAIKAL`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    }).then(r => r.json());
    const modifiedFiles = files.map(f => ({ name: f.name, id: f.id, url: `${url}?action=GET_KAVITHAI&id=${f.id}` }));
    await saveInfoInIndexedDB(KAVITHAIGAL_KEY, KAVITHAIGAL_KEY, modifiedFiles);
    savedKavithaigalFiles = modifiedFiles;
  } else if (isLocal) {
    pickBtn.hidden = false;
  }
  await loadKavithigalFiles(savedKavithaigalFiles);
});

// Pick local folder
pickBtn.addEventListener('click', async () => {
  try {
    const resourcesDirHandle = await window.showDirectoryPicker();
    await loadLocalFileAndContentInDB(resourcesDirHandle);
  } catch (err) {
    console.error('Folder pick cancelled or failed:', err);
  }
});

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
  kavithaigalFiles.innerHTML = '';
  for (const file of fileDetails) {
    const btn = document.createElement('button');
    btn.className = 'kavithaiBtn';
    btn.textContent = file.name;
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
  document.body.classList.add('active');
  const fileName = file.name;
  const savedKavithai = await getInfoFromIndexedDB(KAVITHAI_CONTENT_KEY, fileName);
  let kavithaiContentText = savedKavithai;
  if (!savedKavithai) {
    const fileContent = await fetch(file.url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    }).then(r => r.json());
    kavithaiContentText = fileContent.content;
    await saveInfoInIndexedDB(KAVITHAI_CONTENT_KEY, fileName, kavithaiContentText)
  }
  kavithaiTitle.textContent = fileName;
  kavithaiContent.innerHTML = formatKavithai(kavithaiContentText); // preserves spaces & line breaks
  kavithaiContent.style.backgroundColor = getMataData().color;
  content.hidden = false;
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
  if (refreshedCount > refreshCount) {
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