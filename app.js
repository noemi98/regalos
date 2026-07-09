const API_BASE = 'api';

const DEFAULT_RESERVED_IMAGE = 'assets/reserved-placeholder.png';

let gifts = [];
let shuffledOrder = [];
let currentUser = null;
let editingGiftId = null;
let sortOrder = 'default';
let currentFilter = 'all';
let searchQuery = '';
let showImagesForGuests = true;

const grid = document.getElementById('giftsGrid');
const favoritesSection = document.getElementById('favoritesSection');
const favoritesGrid = document.getElementById('favoritesGrid');
const giftsDivider = document.getElementById('giftsDivider');
const emptyState = document.getElementById('emptyState');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');
const filterPanel = document.getElementById('filterPanel');
const filterBtn = document.getElementById('filterBtn');
const sortBtn = document.getElementById('sortBtn');
const searchBtn = document.getElementById('searchBtn');

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const addGiftBtn = document.getElementById('addGiftBtn');
const toggleImagesBtn = document.getElementById('toggleImagesBtn');

const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

const giftModal = document.getElementById('giftModal');
const giftModalTitle = document.getElementById('giftModalTitle');
const giftForm = document.getElementById('giftForm');
const giftSubmitBtn = document.getElementById('giftSubmitBtn');
const giftIdInput = document.getElementById('giftId');
const giftError = document.getElementById('giftError');
const reservedByField = document.getElementById('reservedByField');
const disabledField = document.getElementById('disabledField');

const imageUpload = document.getElementById('imageUpload');
const imageFile = document.getElementById('imageFile');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewImg = document.getElementById('imagePreviewImg');
const selectImageBtn = document.getElementById('selectImageBtn');
const removeImageBtn = document.getElementById('removeImageBtn');

let selectedImageFile = null;
let previewObjectUrl = null;

async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? { ...(options.headers || {}) }
    : { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const response = await fetch(`${API_BASE}/${endpoint}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Error en la solicitud');
  }

  return data;
}

function formatPrice(price) {
  return `S/. ${Number(price).toFixed(2)}`;
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateToggleImagesBtn() {
  if (!currentUser) return;
  toggleImagesBtn.textContent = showImagesForGuests
    ? 'Ocultar imágenes a invitados'
    : 'Mostrar imágenes a invitados';
}

function updateAuthUI() {
  const isLoggedIn = Boolean(currentUser);

  loginBtn.classList.toggle('hidden', isLoggedIn);
  userInfo.classList.toggle('hidden', !isLoggedIn);
  addGiftBtn.classList.toggle('hidden', !isLoggedIn);
  toggleImagesBtn.classList.toggle('hidden', !isLoggedIn);

  if (isLoggedIn) {
    userName.textContent = currentUser.nombre;
    updateToggleImagesBtn();
  }

  render();
}

function openModal(modal) {
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
}

function hideError(element) {
  element.textContent = '';
  element.classList.add('hidden');
}

function clearImageSelection() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  selectedImageFile = null;
  imageFile.value = '';
  imagePreview.classList.add('hidden');
  imagePlaceholder.classList.remove('hidden');
}

function setImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showError(giftError, 'Selecciona un archivo de imagen válido');
    return;
  }

  hideError(giftError);
  clearImageSelection();

  selectedImageFile = file;
  previewObjectUrl = URL.createObjectURL(file);
  imagePreviewImg.src = previewObjectUrl;
  imagePlaceholder.classList.add('hidden');
  imagePreview.classList.remove('hidden');
}

function getClipboardImageFile(clipboardData) {
  const items = clipboardData?.items;
  if (!items) return null;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (!blob) continue;

      const ext = item.type.split('/')[1] || 'png';
      return new File([blob], `pasted-image.${ext}`, { type: item.type });
    }
  }

  return null;
}

function handlePasteImage(event) {
  if (giftModal.classList.contains('hidden')) return;

  const file = getClipboardImageFile(event.clipboardData);
  if (!file) return;

  event.preventDefault();
  setImageFile(file);
}

async function checkSession() {
  try {
    const data = await apiRequest('me.php');
    currentUser = data.authenticated ? data.user : null;
  } catch {
    currentUser = null;
  }

  updateAuthUI();
}

function setImagePreviewFromUrl(url) {
  if (!url) return;

  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  selectedImageFile = null;
  imageFile.value = '';
  imagePreviewImg.src = url;
  imagePlaceholder.classList.add('hidden');
  imagePreview.classList.remove('hidden');
}

function resetGiftForm() {
  editingGiftId = null;
  giftIdInput.value = '';
  giftForm.reset();
  clearImageSelection();
  reservedByField.classList.add('hidden');
  disabledField.classList.add('hidden');
  giftModalTitle.textContent = 'Registrar nuevo regalo';
  giftSubmitBtn.textContent = 'Guardar regalo';
}

function openCreateGiftModal() {
  if (!currentUser) return;

  hideError(giftError);
  resetGiftForm();
  openModal(giftModal);
  imageUpload.focus();
}

function openEditGiftModal(gift) {
  if (!currentUser || !gift) return;

  hideError(giftError);
  resetGiftForm();

  editingGiftId = gift.id;
  giftIdInput.value = String(gift.id);
  giftModalTitle.textContent = 'Editar regalo';
  giftSubmitBtn.textContent = 'Actualizar regalo';

  giftForm.querySelector('[name="name"]').value = gift.name;
  giftForm.querySelector('[name="price"]').value = gift.price;
  giftForm.querySelector('[name="buyUrl"]').value = gift.buyUrl && gift.buyUrl !== '#' ? gift.buyUrl : '';

  const reservedCheckbox = giftForm.querySelector('[name="reserved"]');
  reservedCheckbox.checked = gift.reserved;
  reservedByField.classList.toggle('hidden', !gift.reserved);

  if (gift.reserved) {
    giftForm.querySelector('[name="reservedBy"]').value = gift.reservedBy || '';
  }

  disabledField.classList.remove('hidden');
  giftForm.querySelector('[name="disabled"]').checked = !gift.enabled;

  if (gift.imageUrl) {
    setImagePreviewFromUrl(gift.imageUrl);
  }

  openModal(giftModal);
  imageUpload.focus();
}

async function loadGifts() {
  grid.innerHTML = '<p class="loading-state">Cargando regalos...</p>';
  favoritesSection.classList.add('hidden');
  favoritesGrid.innerHTML = '';
  giftsDivider.classList.add('hidden');

  try {
    const data = await apiRequest('gifts.php');
    gifts = data.gifts || [];
    if ('showImagesForGuests' in data) {
      showImagesForGuests = Boolean(Number(data.showImagesForGuests));
      updateToggleImagesBtn();
    }
    shuffledOrder = shuffleArray(gifts.map((g) => g.id));
    render();
  } catch (error) {
    grid.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

function getFilteredGifts() {
  let result = currentUser ? [...gifts] : gifts.filter((g) => g.enabled);

  if (currentFilter === 'available') {
    result = result.filter((g) => !g.reserved);
  } else if (currentFilter === 'reserved') {
    result = result.filter((g) => g.reserved);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter((g) => g.name.toLowerCase().includes(q));
  }

  if (sortOrder === 'price-asc') {
    result.sort((a, b) => a.price - b.price);
  } else if (sortOrder === 'price-desc') {
    result.sort((a, b) => b.price - a.price);
  } else if (sortOrder === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  } else {
    const orderMap = new Map(shuffledOrder.map((id, index) => [id, index]));
    result.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  }

  if (currentUser) {
    const enabled = result.filter((g) => g.enabled);
    const disabled = result.filter((g) => !g.enabled);
    result = [...enabled, ...disabled];
  }

  return result;
}

function getReservedLabel(gift) {
  const name = gift.reservedBy || gift.creatorName || 'Sin nombre';
  return `RESERVADO: ${name}`;
}

function renderGiftCard(gift, { inFavorites = false } = {}) {
  const isEditable = Boolean(currentUser);
  const realImageSrc = gift.images[0] || DEFAULT_RESERVED_IMAGE;
  const usePeekImage = inFavorites && gift.reserved && !isEditable && !showImagesForGuests;

  let imageHtml;
  if (usePeekImage) {
    imageHtml = `
      <img
        class="gift-card__image gift-card__image--cover"
        src="${DEFAULT_RESERVED_IMAGE}"
        alt="${gift.name}"
        loading="lazy"
      >
      <img
        class="gift-card__image gift-card__image--peek"
        src="${realImageSrc}"
        alt=""
        loading="lazy"
        aria-hidden="true"
      >
    `;
  } else {
    const showRealImage = isEditable || showImagesForGuests;
    const imageSrc = showRealImage ? realImageSrc : DEFAULT_RESERVED_IMAGE;
    imageHtml = `
      <img
        class="gift-card__image"
        src="${imageSrc}"
        alt="${gift.name}"
        loading="lazy"
      >
    `;
  }

  let footer;
  if (gift.reserved) {
    footer = `<span class="badge-reserved">${getReservedLabel(gift)}</span>`;
  } else if (inFavorites) {
    footer = `<span class="gift-card__price">${formatPrice(gift.price)}</span>`;
  } else {
    footer = `
      <span class="gift-card__price">${formatPrice(gift.price)}</span>
      <a href="${gift.buyUrl || '#'}" class="gift-card__buy" target="_blank" rel="noopener">Comprar</a>
    `;
  }

  const disabledBadge = isEditable && !gift.enabled
    ? '<span class="badge-disabled">Deshabilitado</span>'
    : '';

  const cardClasses = [
    'gift-card',
    gift.reserved ? 'gift-card--reserved' : '',
    !gift.enabled ? 'gift-card--disabled' : '',
    isEditable ? 'gift-card--editable' : '',
    inFavorites ? 'gift-card--favorite' : '',
    usePeekImage ? 'gift-card--peek-image' : '',
  ].filter(Boolean).join(' ');

  return `
    <article class="${cardClasses}" data-id="${gift.id}">
      <div class="gift-card__image-wrap">
        ${disabledBadge}
        ${inFavorites ? '<span class="gift-card__heart" aria-hidden="true">♥</span>' : ''}
        ${imageHtml}
      </div>
      <div class="gift-card__body">
        ${inFavorites ? '<span class="gift-card__favorite-tag">Favorito</span>' : ''}
        <h3 class="gift-card__name">${gift.name}</h3>
        <div class="gift-card__footer">${footer}</div>
      </div>
    </article>
  `;
}

function render() {
  const filtered = getFilteredGifts();
  const favorites = filtered.filter((g) => g.favorite);
  const regular = filtered.filter((g) => !g.favorite);

  if (favorites.length > 0) {
    favoritesSection.classList.remove('hidden');
    favoritesGrid.innerHTML = favorites.map((g) => renderGiftCard(g, { inFavorites: true })).join('');
  } else {
    favoritesSection.classList.add('hidden');
    favoritesGrid.innerHTML = '';
  }

  const showDivider = favorites.length > 0 && regular.length > 0;
  giftsDivider.classList.toggle('hidden', !showDivider);

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  grid.innerHTML = regular.map((g) => renderGiftCard(g)).join('');
}

function togglePanel(panel, btn) {
  const isHidden = panel.classList.contains('hidden');
  searchBar.classList.add('hidden');
  filterPanel.classList.add('hidden');
  filterBtn.classList.remove('active');
  sortBtn.classList.remove('active');
  searchBtn.classList.remove('active');

  if (isHidden) {
    panel.classList.remove('hidden');
    btn.classList.add('active');
    if (panel === searchBar) searchInput.focus();
  }
}

loginBtn.addEventListener('click', () => {
  hideError(loginError);
  loginForm.reset();
  openModal(loginModal);
});

logoutBtn.addEventListener('click', async () => {
  try {
    await apiRequest('logout.php', { method: 'POST' });
    currentUser = null;
    updateAuthUI();
    await loadGifts();
  } catch (error) {
    alert(error.message);
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(loginError);

  const formData = new FormData(loginForm);
  const payload = {
    username: formData.get('username'),
    password: formData.get('password'),
  };

  try {
    const data = await apiRequest('login.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    currentUser = data.user;
    updateAuthUI();
    await loadGifts();
    closeModal(loginModal);
    loginForm.reset();
  } catch (error) {
    showError(loginError, error.message);
  }
});

addGiftBtn.addEventListener('click', openCreateGiftModal);

toggleImagesBtn.addEventListener('click', async () => {
  try {
    const data = await apiRequest('settings.php', {
      method: 'POST',
      body: JSON.stringify({ showImagesForGuests: !showImagesForGuests }),
    });
    showImagesForGuests = data.showImagesForGuests;
    updateToggleImagesBtn();
    render();
  } catch (error) {
    alert(error.message);
  }
});

selectImageBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  imageFile.click();
});

imageUpload.addEventListener('click', (e) => {
  if (e.target.closest('#removeImageBtn, #selectImageBtn')) return;
  if (!selectedImageFile) imageFile.click();
});

imageFile.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) setImageFile(file);
});

removeImageBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearImageSelection();
});

imageUpload.addEventListener('dragover', (e) => {
  e.preventDefault();
  imageUpload.classList.add('dragover');
});

imageUpload.addEventListener('dragleave', () => {
  imageUpload.classList.remove('dragover');
});

imageUpload.addEventListener('drop', (e) => {
  e.preventDefault();
  imageUpload.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (file) setImageFile(file);
});

imageUpload.addEventListener('paste', handlePasteImage);
giftModal.addEventListener('paste', handlePasteImage);
document.addEventListener('paste', handlePasteImage);

giftForm.querySelector('[name="reserved"]').addEventListener('change', (e) => {
  reservedByField.classList.toggle('hidden', !e.target.checked);
  if (e.target.checked && currentUser && !giftForm.querySelector('[name="reservedBy"]').value) {
    giftForm.querySelector('[name="reservedBy"]').value = currentUser.nombre;
  }
});

giftForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(giftError);

  const formData = new FormData(giftForm);
  const reserved = formData.get('reserved') === 'on';

  formData.delete('reserved');
  formData.append('reserved', reserved ? '1' : '0');

  if (reserved) {
    const reservedBy = formData.get('reservedBy') || currentUser?.nombre || '';
    formData.set('reservedBy', reservedBy);
  } else {
    formData.set('reservedBy', '');
  }

  if (selectedImageFile) {
    formData.set('image', selectedImageFile);
  } else {
    formData.delete('image');
  }

  const isEditing = Boolean(editingGiftId);
  if (isEditing) {
    formData.set('id', String(editingGiftId));
    const disabled = formData.get('disabled') === 'on';
    formData.delete('disabled');
    formData.append('habilitado', disabled ? '0' : '1');
  }

  try {
    const data = await apiRequest('gifts.php', {
      method: 'POST',
      body: formData,
    });

    if (isEditing) {
      const index = gifts.findIndex((g) => g.id === data.gift.id);
      if (index !== -1) gifts[index] = data.gift;
    } else {
      gifts.push(data.gift);
      shuffledOrder.push(data.gift.id);
    }

    render();
    closeModal(giftModal);
    resetGiftForm();
  } catch (error) {
    showError(giftError, error.message);
  }
});

document.querySelectorAll('[data-close]').forEach((el) => {
  el.addEventListener('click', () => {
    const modalId = el.dataset.close;
    const modal = document.getElementById(modalId);
    if (modal) closeModal(modal);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!loginModal.classList.contains('hidden')) closeModal(loginModal);
  if (!giftModal.classList.contains('hidden')) closeModal(giftModal);
});

filterBtn.addEventListener('click', () => togglePanel(filterPanel, filterBtn));

sortBtn.addEventListener('click', () => {
  const orders = ['default', 'price-asc', 'price-desc', 'name'];
  const labels = ['Orden predeterminado', 'Precio: menor a mayor', 'Precio: mayor a menor', 'Nombre A-Z'];
  const currentIdx = orders.indexOf(sortOrder);
  const nextIdx = (currentIdx + 1) % orders.length;
  sortOrder = orders[nextIdx];
  sortBtn.title = labels[nextIdx];
  render();
});

searchBtn.addEventListener('click', () => togglePanel(searchBar, searchBtn));

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  render();
});

filterPanel.addEventListener('change', (e) => {
  if (e.target.name === 'filter') {
    currentFilter = e.target.value;
    render();
  }
});

grid.addEventListener('click', (e) => {
  if (e.target.closest('.gift-card__buy')) return;

  const card = e.target.closest('.gift-card--editable');
  if (!card || !currentUser) return;

  const id = Number(card.dataset.id);
  const gift = gifts.find((g) => g.id === id);
  if (gift) openEditGiftModal(gift);
});

favoritesGrid.addEventListener('click', (e) => {
  if (e.target.closest('.gift-card__buy')) return;

  const card = e.target.closest('.gift-card--editable');
  if (!card || !currentUser) return;

  const id = Number(card.dataset.id);
  const gift = gifts.find((g) => g.id === id);
  if (gift) openEditGiftModal(gift);
});

async function init() {
  await checkSession();
  await loadGifts();
}

init();
