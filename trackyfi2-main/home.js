import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Configuración Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBj0vG5CgWxEBrvkNBMvMU9TFcKuqLP0cc",
    authDomain: "trackyfi-317e1.firebaseapp.com",
    projectId: "trackyfi-317e1",
    storageBucket: "trackyfi-317e1.appspot.com",
    messagingSenderId: "843779589124",
    appId: "1:843779589124:web:d782b98668b1c16ce0a151",
    measurementId: "G-9DQCFXXND3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =======================
// VARIABLES Y CONSTANTES ULTRA MEJORADAS
// =======================
const EOD_API_KEY = "685dbffc6fc317.12238654";
const OPENFIGI_API_KEY = "f4ae7665-74e9-41e9-bc73-3764b37f2d2d";
const ALPHA_VANTAGE_API_KEY = "demo";

let portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '[]');
let portfolioHistory = JSON.parse(localStorage.getItem('portfolioHistory') || '[]');
let performanceChart = null;
let assetDistributionChart = null;
let typeDistributionChart = null;
let dividendHistoryChart = null;

// =======================
// UTILIDADES ULTRA AVANZADAS
// =======================
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency 
    }).format(amount || 0);
}

function formatPercentage(value) {
    return `${(value || 0).toFixed(2)}%`;
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.getElementById('alertsContainer').appendChild(alertDiv);
    setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
}

function calculatePortfolioMetrics() {
    const totalValue = portfolioData.reduce((sum, asset) => sum + (asset.value || 0), 0);
    const totalInvestment = portfolioData.reduce((sum, asset) => 
        sum + ((asset.quantity || asset.amount || 0) * (asset.purchase_price || 0)), 0);
    const totalProfit = totalValue - totalInvestment;
    const totalReturn = totalInvestment > 0 ? (totalProfit / totalInvestment * 100) : 0;

    return { totalValue, totalInvestment, totalProfit, totalReturn };
}

// =======================
// BÚSQUEDA AVANZADA POR ISIN ULTRA MEJORADA
// =======================
async function searchByISIN(isin) {
    const loadingSpinner = document.getElementById('isinLoadingSpinner');
    const resultsDiv = document.getElementById('isinSearchResults');
    
    loadingSpinner.classList.remove('d-none');
    resultsDiv.innerHTML = '';

    try {
        // Intentar múltiples fuentes de datos
        let found = false;
        
        // 1. Primero intentar OpenFIGI
        try {
            const figiResponse = await fetch("https://api.openfigi.com/v3/mapping", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-OPENFIGI-APIKEY": OPENFIGI_API_KEY
                },
                body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin }])
            });

            const figiData = await figiResponse.json();
            
            if (figiData && figiData[0] && figiData[0].data && figiData[0].data.length > 0) {
                const assetInfo = figiData[0].data[0];
                const ticker = assetInfo.ticker;
                
                // Obtener precio actual
                const price = await getPriceByTicker_EOD(ticker);
                
                displaySearchResult(assetInfo.name || ticker, ticker, isin, price, assetInfo.tradingCurrency || 'USD', 'OpenFIGI');
                found = true;
            }
        } catch (e) {
            console.log('OpenFIGI failed, trying alternatives...');
        }

        // 2. Si OpenFIGI falla, intentar con EOD Historical Data
        if (!found) {
            try {
                const eodResponse = await fetch(`https://eodhistoricaldata.com/api/search?api_token=${EOD_API_KEY}&search_term=${isin}&limit=5&fmt=json`);
                const eodData = await eodResponse.json();
                
                if (eodData && eodData.length > 0) {
                    const assetInfo = eodData[0];
                    const price = await getPriceByTicker_EOD(assetInfo.Code);
                    
                    displaySearchResult(assetInfo.Name || assetInfo.Code, assetInfo.Code, isin, price, 'USD', 'EOD Historical Data');
                    found = true;
                }
            } catch (e) {
                console.log('EOD failed, trying manual search...');
            }
        }

        // 3. Si todo falla, búsqueda manual
        if (!found) {
            resultsDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-search me-2"></i>
                    No se encontró información automática para el ISIN: ${isin}
                    <hr>
                    <p class="mb-0">Puedes agregar el activo manualmente usando el formulario de abajo.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching ISIN:', error);
        resultsDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error al buscar el ISIN. Inténtalo de nuevo o agrega el activo manualmente.
            </div>
        `;
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

function displaySearchResult(name, ticker, isin, price, currency, source) {
    const resultsDiv = document.getElementById('isinSearchResults');
    resultsDiv.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h6 class="card-title">${name}</h6>
                <div class="row">
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Ticker:</strong> ${ticker}</p>
                        <p class="mb-1"><strong>ISIN:</strong> ${isin}</p>
                        <p class="mb-1"><strong>Fuente:</strong> ${source}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Precio Actual:</strong> ${price ? formatCurrency(price) : 'No disponible'}</p>
                        <p class="mb-1"><strong>Moneda:</strong> ${currency}</p>
                    </div>
                </div>
                <button class="btn btn-primary btn-sm mt-2" onclick="addAssetFromSearch('${name}', '${ticker}', '${isin}', ${price || 0}, '${currency}')">
                    <i class="fas fa-plus me-1"></i>Agregar al Portafolio
                </button>
            </div>
        </div>
    `;
}

window.addAssetFromSearch = function(name, ticker, isin, price, currency) {
    document.getElementById('name').value = name;
    document.getElementById('ticker').value = ticker;
    document.getElementById('isin').value = isin;
    document.getElementById('purchase_price').value = price;
    document.getElementById('currency').value = currency;
    
    // Mostrar el formulario de agregar activo
    const formContainer = document.getElementById('assetFormContainer');
    if (!formContainer.classList.contains('show')) {
        new bootstrap.Collapse(formContainer).show();
    }
    
    showAlert(`Información cargada para ${name}. Completa la cantidad y otros detalles.`, 'success');
};

// =======================
// API CALLS ULTRA MEJORADAS
// =======================
async function getTickerByISIN_OpenFIGI(isin) {
    const url = "https://api.openfigi.com/v3/mapping";
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-OPENFIGI-APIKEY": OPENFIGI_API_KEY
            },
            body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin }])
        });
        const data = await res.json();
        if (data && data[0] && data[0].data && data[0].data.length > 0) {
            return data[0].data[0].ticker || data[0].data[0].compositeFIGI || null;
        } else {
            return null;
        }
    } catch (e) {
        console.error('Error getting ticker from ISIN:', e);
        return null;
    }
}

async function getPriceByTicker_EOD(ticker) {
    const url = `https://eodhd.com/api/real-time/${ticker}?api_token=${EOD_API_KEY}&fmt=json`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.close || null;
    } catch (e) {
        console.error('Error getting price from EOD:', e);
        return null;
    }
}

async function getPriceByISIN_OpenFIGI_EOD(isin, fallbackTicker = null) {
    let ticker = await getTickerByISIN_OpenFIGI(isin);
    if (!ticker && fallbackTicker) ticker = fallbackTicker;
    if (!ticker) return null;
    return await getPriceByTicker_EOD(ticker);
}

// =======================
// FUNCIONES CRYPTO ULTRA AVANZADAS
// =======================
async function getCurrentPriceCrypto(cryptoId, currency = 'usd') {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${currency}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data[cryptoId] ? data[cryptoId][currency] : null;
    } catch (e) {
        console.error('Error getting crypto price:', e);
        return null;
    }
}

async function searchCrypto(query) {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.coins || [];
    } catch (e) {
        console.error('Error searching crypto:', e);
        return [];
    }
}

// Función para agregar crypto específico
window.addCryptoToPortfolio = async function(cryptoId, name, symbol) {
    try {
        const price = await getCurrentPriceCrypto(cryptoId);
        if (price) {
            document.getElementById('name').value = name;
            document.getElementById('ticker').value = symbol.toUpperCase();
            document.getElementById('purchase_price').value = price;
            document.getElementById('currency').value = 'USD';
            
            // Agregar campo oculto para identificar el tipo crypto
            let cryptoIdField = document.getElementById('crypto_id');
            if (!cryptoIdField) {
                cryptoIdField = document.createElement('input');
                cryptoIdField.type = 'hidden';
                cryptoIdField.id = 'crypto_id';
                cryptoIdField.name = 'crypto_id';
                document.getElementById('addAssetForm').appendChild(cryptoIdField);
            }
            cryptoIdField.value = cryptoId;
            
            // Mostrar el formulario
            const formContainer = document.getElementById('assetFormContainer');
            if (!formContainer.classList.contains('show')) {
                new bootstrap.Collapse(formContainer).show();
            }
            
            showAlert(`${name} cargado. Precio actual: ${formatCurrency(price)}`, 'success');
        } else {
            showAlert('No se pudo obtener el precio de esta criptomoneda', 'warning');
        }
    } catch (error) {
        console.error('Error adding crypto:', error);
        showAlert('Error al cargar la criptomoneda', 'danger');
    }
};

// =======================
// ACTUALIZACIÓN DE PRECIOS ULTRA MEJORADA
// =======================
async function updateAllPrices() {
    const updateBtn = document.getElementById('updateAllPricesBtn');
    const originalText = updateBtn.innerHTML;
    
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Actualizando...';
    updateBtn.disabled = true;
    
    showAlert("Actualizando precios, por favor espera...", "info");
    
    for (let i = 0; i < portfolioData.length; i++) {
        const asset = portfolioData[i];
        let price = null;
        
        try {
            if (asset.type === "stock") {
                if (asset.isin && asset.isin.trim() !== "") {
                    price = await getPriceByISIN_OpenFIGI_EOD(asset.isin, asset.ticker);
                }
                if ((price === null || price === undefined) && asset.ticker) {
                    price = await getPriceByTicker_EOD(asset.ticker);
                }
            } else if (asset.type === "crypto") {
                const cryptoId = asset.crypto_id || asset.name_id || asset.ticker.toLowerCase();
                price = await getCurrentPriceCrypto(cryptoId, (asset.currency || 'usd').toLowerCase());
            }
            
            if (price !== null && price !== undefined) {
                asset.current_price = price;
                asset.value = (asset.quantity || asset.amount) * price;
                asset.profit = asset.value - ((asset.quantity || asset.amount) * (asset.purchase_price || 0)) - (asset.commission || 0);
                asset.priceError = null;
                asset.lastUpdated = new Date().toISOString();
            } else {
                asset.current_price = null;
                asset.value = null;
                asset.profit = null;
                asset.priceError = 'No se pudo obtener el precio.';
            }
        } catch (error) {
            console.error(`Error updating price for ${asset.name}:`, error);
            asset.priceError = 'Error al actualizar precio.';
        }
        
        // Pequeña pausa para no sobrecargar las APIs
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Guardar historial para gráficos de performance
    const metrics = calculatePortfolioMetrics();
    portfolioHistory.push({
        date: new Date().toISOString(),
        totalValue: metrics.totalValue,
        totalInvestment: metrics.totalInvestment,
        totalProfit: metrics.totalProfit,
        totalReturn: metrics.totalReturn
    });
    
    // Mantener solo los últimos 90 días
    if (portfolioHistory.length > 90) {
        portfolioHistory = portfolioHistory.slice(-90);
    }
    
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    localStorage.setItem('portfolioHistory', JSON.stringify(portfolioHistory));
    
    renderPortfolio();
    updatePerformanceChart();
    
    updateBtn.innerHTML = originalText;
    updateBtn.disabled = false;
    
    showAlert("Precios actualizados correctamente.", "success");
}

// =======================
// GRÁFICO DE RENDIMIENTO ESTILO TRADING (LÍNEAS)
// =======================
function updatePerformanceChart() {
    const ctx = document.getElementById('portfolioPerformanceChart');
    if (!ctx) return;
    
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    const labels = portfolioHistory.map(h => new Date(h.date).toLocaleDateString());
    const values = portfolioHistory.map(h => h.totalValue);
    const returns = portfolioHistory.map(h => h.totalReturn);
    
    performanceChart = new Chart(ctx, {
        type: 'line', // Cambiado a líneas estilo trading
        data: {
            labels: labels,
            datasets: [{
                label: 'Valor del Portafolio',
                data: values,
                borderColor: '#4f46e5',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.1, // Líneas más suaves estilo trading
                pointRadius: 2,
                pointHoverRadius: 8,
                borderWidth: 3
            }, {
                label: 'Rendimiento (%)',
                data: returns,
                borderColor: '#10b981',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.1,
                yAxisID: 'y1',
                pointRadius: 1,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Valor: ${formatCurrency(context.parsed.y)}`;
                            } else {
                                return `Rendimiento: ${formatPercentage(context.parsed.y)}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Fecha'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Valor ($)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Rendimiento (%)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: function(value) {
                            return formatPercentage(value);
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            elements: {
                point: {
                    hoverBorderWidth: 3
                }
            }
        }
    });
    
    // Actualizar métricas de rendimiento
    updatePerformanceMetrics();
}

function updatePerformanceMetrics() {
    if (portfolioHistory.length < 2) {
        document.getElementById('annualizedReturn').textContent = '0.00%';
        document.getElementById('volatility').textContent = '0.00%';
        document.getElementById('sharpeRatio').textContent = '0.00';
        document.getElementById('maxDrawdown').textContent = '0.00%';
        return;
    }
    
    const returns = portfolioHistory.map(h => h.totalReturn);
    const values = portfolioHistory.map(h => h.totalValue);
    
    // Rendimiento anualizado
    const firstReturn = returns[0];
    const lastReturn = returns[returns.length - 1];
    const periods = portfolioHistory.length;
    const annualizedReturn = Math.pow((1 + lastReturn/100), 365/periods) - 1;
    
    // Volatilidad (desviación estándar de los rendimientos)
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Ratio Sharpe (asumiendo tasa libre de riesgo del 2%)
    const riskFreeRate = 2;
    const sharpeRatio = (annualizedReturn * 100 - riskFreeRate) / volatility;
    
    // Máximo Drawdown
    let maxDrawdown = 0;
    let peak = values[0];
    for (let i = 1; i < values.length; i++) {
        if (values[i] > peak) {
            peak = values[i];
        } else {
            const drawdown = (peak - values[i]) / peak * 100;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
    }
    
    // Diversificación
    const uniqueAssets = new Set(portfolioData.map(a => a.ticker || a.name)).size;
    let diversificationScore = 'Baja';
    if (uniqueAssets >= 10) diversificationScore = 'Alta';
    else if (uniqueAssets >= 5) diversificationScore = 'Media';
    
    document.getElementById('annualizedReturn').textContent = formatPercentage(annualizedReturn * 100);
    document.getElementById('volatility').textContent = formatPercentage(volatility);
    document.getElementById('sharpeRatio').textContent = sharpeRatio.toFixed(2);
    document.getElementById('maxDrawdown').textContent = formatPercentage(maxDrawdown);
    document.getElementById('diversificationScore').textContent = diversificationScore;
}

// =======================
// GRÁFICOS DE DISTRIBUCIÓN ESTILO LÍNEAS
// =======================
function updateDistributionCharts() {
    updateAssetDistributionChart();
    updateTypeDistributionChart();
}

function updateAssetDistributionChart() {
    const ctx = document.getElementById('assetDistributionChart');
    if (!ctx) return;
    
    if (assetDistributionChart) {
        assetDistributionChart.destroy();
    }
    
    const totalValue = portfolioData.reduce((sum, asset) => sum + (asset.value || 0), 0);
    const labels = portfolioData.map(asset => asset.name || asset.crypto_name || 'Efectivo');
    const data = portfolioData.map(asset => ((asset.value || 0) / totalValue * 100));
    
    assetDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
                ],
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed.toFixed(2)}%`;
                        }
                    }
                }
            }
        }
    });
}

function updateTypeDistributionChart() {
    const ctx = document.getElementById('typeDistributionChart');
    if (!ctx) return;
    
    if (typeDistributionChart) {
        typeDistributionChart.destroy();
    }
    
    const totalValue = portfolioData.reduce((sum, asset) => sum + (asset.value || 0), 0);
    
    let stockValue = 0, cryptoValue = 0, cashValue = 0;
    portfolioData.forEach(asset => {
        if (asset.type === 'stock') stockValue += asset.value || 0;
        else if (asset.type === 'crypto') cryptoValue += asset.value || 0;
        else if (asset.type === 'cash') cashValue += asset.amount || 0;
    });
    
    const data = [
        (stockValue / totalValue * 100) || 0,
        (cryptoValue / totalValue * 100) || 0,
        (cashValue / totalValue * 100) || 0
    ];
    
    // Convertir a gráfico de líneas
    typeDistributionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Acciones', 'Criptomonedas', 'Efectivo'],
            datasets: [{
                label: 'Distribución por Tipo (%)',
                data: data,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 8,
                pointHoverRadius: 12,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                }
            }
        }
    });
}

// =======================
// RENDERIZADO DE PORTAFOLIO ULTRA MEJORADO
// =======================
function renderPortfolio() {
    const container = document.getElementById("portfolioContent");
    if (!portfolioData.length) {
        container.innerHTML = `
            <div class="empty-portfolio text-center py-5">
                <i class="fas fa-chart-pie fa-4x text-muted mb-3"></i>
                <h4>Tu portafolio está vacío</h4>
                <p class="text-muted">Comienza agregando tus primeros activos usando el buscador ISIN o añade criptomonedas</p>
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <button class="btn btn-primary me-2" onclick="document.getElementById('isinSearchInput').focus()">
                            <i class="fas fa-search me-2"></i>Buscar por ISIN
                        </button>
                        <button class="btn btn-warning" onclick="showCryptoSelector()">
                            <i class="fab fa-bitcoin me-2"></i>Añadir Crypto
                        </button>
                    </div>
                </div>
            </div>
        `;
        updateStats();
        return;
    }

    const totalValue = portfolioData.reduce((sum, a) => sum + (a.value || 0), 0);

    let html = `
        <div class="table-responsive">
            <table class="table table-striped align-middle">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Ticker</th>
                        <th>ISIN</th>
                        <th>Cantidad</th>
                        <th>Precio Compra</th>
                        <th>Precio Actual</th>
                        <th>Valor</th>
                        <th>Peso (%)</th>
                        <th>Ganancia/Pérdida</th>
                        <th>Dividendos Est.</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    portfolioData.forEach((asset, idx) => {
        const peso = totalValue ? ((asset.value || 0) / totalValue * 100).toFixed(2) : "0.00";
        const ganancia = asset.profit || 0;
        const dividendosEst = asset.type === 'stock' ? (asset.value || 0) * 0.03 : 0; // Solo para acciones
        
        let gananciaClass = "";
        if (asset.profit !== undefined && asset.profit !== null) {
            gananciaClass = ganancia < 0 ? 'text-danger fw-bold' : ganancia > 0 ? 'text-success fw-bold' : '';
        }
        
        let priceDisplay = asset.current_price !== undefined && asset.current_price !== null 
            ? formatCurrency(asset.current_price) 
            : (asset.priceError || "Cargando...");
        
        if (asset.lastUpdated) {
            const lastUpdate = new Date(asset.lastUpdated).toLocaleString();
            priceDisplay += `<br><small class="text-muted">Actualizado: ${lastUpdate}</small>`;
        }

        // Iconos específicos por tipo
        let iconClass = 'chart-line';
        if (asset.type === 'crypto') iconClass = 'bitcoin';
        else if (asset.type === 'cash') iconClass = 'wallet';

        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="asset-icon me-2">
                            <i class="fas fa-${iconClass}"></i>
                        </div>
                        <div>
                            <div class="fw-bold">${asset.name || asset.crypto_name || "Efectivo"}</div>
                            <small class="text-muted">${asset.type || 'stock'}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-secondary">${asset.ticker || "-"}</span></td>
                <td><code class="small">${asset.isin || "-"}</code></td>
                <td>${(asset.quantity || asset.amount || 0).toLocaleString()}</td>
                <td>${asset.purchase_price ? formatCurrency(asset.purchase_price) : "-"}</td>
                <td>${priceDisplay}</td>
                <td>${asset.value !== undefined && asset.value !== null ? formatCurrency(asset.value) : "-"}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar" role="progressbar" style="width: ${peso}%" aria-valuenow="${peso}" aria-valuemin="0" aria-valuemax="100">
                            ${peso}%
                        </div>
                    </div>
                </td>
                <td class="${gananciaClass}">
                    ${asset.profit !== undefined && asset.profit !== null ? formatCurrency(asset.profit) : "-"}
                    ${ganancia !== 0 ? `<br><small>(${formatPercentage((ganancia / ((asset.quantity || asset.amount || 0) * (asset.purchase_price || 0))) * 100)})</small>` : ''}
                </td>
                <td>${formatCurrency(dividendosEst)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewDetails(${idx})" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="editAsset(${idx})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAsset(${idx})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table></div>";
    container.innerHTML = html;

    updateStats();
    updateDistributionCharts();
}

// =======================
// SELECTOR DE CRIPTOMONEDAS ULTRA AVANZADO
// =======================
window.showCryptoSelector = async function() {
    try {
        // Mostrar modal de carga
        const modalHtml = `
            <div class="modal fade" id="cryptoSelectorModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fab fa-bitcoin me-2"></i>Seleccionar Criptomoneda
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="input-group mb-3">
                                <span class="input-group-text"><i class="fas fa-search"></i></span>
                                <input type="text" id="cryptoSearchInput" class="form-control" 
                                       placeholder="Buscar criptomoneda (ej: Bitcoin, Ethereum, BTC)">
                            </div>
                            <div id="cryptoResults">
                                <div class="text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Cargando criptomonedas...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal existente si existe
        const existingModal = document.getElementById('cryptoSelectorModal');
        if (existingModal) existingModal.remove();
        
        // Agregar nuevo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('cryptoSelectorModal'));
        modal.show();
        
        // Cargar criptomonedas populares
        loadPopularCryptos();
        
        // Configurar búsqueda
        document.getElementById('cryptoSearchInput').addEventListener('input', debounce(searchCryptos, 500));
        
    } catch (error) {
        console.error('Error showing crypto selector:', error);
        showAlert('Error al cargar selector de criptomonedas', 'danger');
    }
};

async function loadPopularCryptos() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1');
        const cryptos = await response.json();
        
        displayCryptos(cryptos);
    } catch (error) {
        console.error('Error loading popular cryptos:', error);
        document.getElementById('cryptoResults').innerHTML = `
            <div class="alert alert-warning">
                Error al cargar criptomonedas. Por favor, intenta de nuevo.
            </div>
        `;
    }
}

async function searchCryptos() {
    const query = document.getElementById('cryptoSearchInput').value.trim();
    if (!query) {
        loadPopularCryptos();
        return;
    }
    
    try {
        const cryptos = await searchCrypto(query);
        if (cryptos.length > 0) {
            // Obtener precios para los primeros 10 resultados
            const cryptoIds = cryptos.slice(0, 10).map(c => c.id).join(',');
            const priceResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true`);
            const prices = await priceResponse.json();
            
            const cryptosWithPrices = cryptos.slice(0, 10).map(crypto => ({
                ...crypto,
                current_price: prices[crypto.id]?.usd || 0,
                price_change_percentage_24h: prices[crypto.id]?.usd_24h_change || 0
            }));
            
            displayCryptos(cryptosWithPrices);
        } else {
            document.getElementById('cryptoResults').innerHTML = `
                <div class="alert alert-info">
                    No se encontraron resultados para "${query}"
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching cryptos:', error);
        document.getElementById('cryptoResults').innerHTML = `
            <div class="alert alert-danger">
                Error en la búsqueda. Por favor, intenta de nuevo.
            </div>
        `;
    }
}

function displayCryptos(cryptos) {
    const resultsDiv = document.getElementById('cryptoResults');
    let html = '<div class="row">';
    
    cryptos.forEach(crypto => {
        const priceChange = crypto.price_change_percentage_24h || 0;
        const changeClass = priceChange >= 0 ? 'text-success' : 'text-danger';
        const changeIcon = priceChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="card h-100 crypto-card" onclick="addCryptoToPortfolio('${crypto.id}', '${crypto.name}', '${crypto.symbol}')">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <img src="${crypto.image || crypto.large || 'https://via.placeholder.com/40'}" 
                                 alt="${crypto.name}" class="crypto-logo me-3">
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${crypto.name}</h6>
                                <small class="text-muted">${(crypto.symbol || '').toUpperCase()}</small>
                            </div>
                            <div class="text-end">
                                <div class="fw-bold">${formatCurrency(crypto.current_price || 0)}</div>
                                <small class="${changeClass}">
                                    <i class="fas ${changeIcon}"></i>
                                    ${Math.abs(priceChange).toFixed(2)}%
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Utility function para debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =======================
// ESTADÍSTICAS ULTRA MEJORADAS
// =======================
function updateStats() {
    const metrics = calculatePortfolioMetrics();
    
    document.getElementById("totalValue").textContent = formatCurrency(metrics.totalValue);
    document.getElementById("totalInvestment").textContent = formatCurrency(metrics.totalInvestment);
    document.getElementById("totalReturn").textContent = formatPercentage(metrics.totalReturn);

    const totalProfitElem = document.getElementById("totalProfit");
    totalProfitElem.textContent = formatCurrency(metrics.totalProfit);
    
    // Actualizar colores según ganancia/pérdida
    if (metrics.totalProfit < 0) {
        totalProfitElem.className = "stat-value text-danger";
        document.getElementById("profitChange").textContent = "📉 Pérdida";
        document.getElementById("profitChange").className = "stat-change text-danger";
    } else if (metrics.totalProfit > 0) {
        totalProfitElem.className = "stat-value text-success";
        document.getElementById("profitChange").textContent = "📈 Ganancia";
        document.getElementById("profitChange").className = "stat-change text-success";
    } else {
        totalProfitElem.className = "stat-value";
        document.getElementById("profitChange").textContent = "➡️ Sin cambios";
        document.getElementById("profitChange").className = "stat-change";
    }
    
    // Actualizar cambios de valor
    if (portfolioHistory.length > 1) {
        const prevValue = portfolioHistory[portfolioHistory.length - 2].totalValue;
        const changePercent = ((metrics.totalValue - prevValue) / prevValue * 100);
        document.getElementById("totalValueChange").textContent = 
            `${changePercent > 0 ? '+' : ''}${formatPercentage(changePercent)}`;
        document.getElementById("totalValueChange").className = 
            `stat-change ${changePercent > 0 ? 'text-success' : changePercent < 0 ? 'text-danger' : ''}`;
    }
}

// =======================
// FUNCIONES DE ACTIVOS MEJORADAS
// =======================
window.editAsset = function(idx) {
    const asset = portfolioData[idx];
    let html = `
        <input type="hidden" name="idx" value="${idx}">
        <div class="mb-3">
            <label class="form-label">Nombre</label>
            <input type="text" class="form-control" name="name" value="${asset.name || asset.crypto_name || ''}" required>
        </div>
        <div class="mb-3">
            <label class="form-label">Ticker</label>
            <input type="text" class="form-control" name="ticker" value="${asset.ticker || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">ISIN</label>
            <input type="text" class="form-control" name="isin" value="${asset.isin || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Cantidad</label>
            <input type="number" step="0.00000001" class="form-control" name="quantity" value="${asset.quantity || asset.amount || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Precio Compra</label>
            <input type="number" step="0.01" class="form-control" name="purchase_price" value="${asset.purchase_price || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Tipo</label>
            <select class="form-control" name="type">
                <option value="stock" ${asset.type === 'stock' ? 'selected' : ''}>Acción</option>
                <option value="crypto" ${asset.type === 'crypto' ? 'selected' : ''}>Criptomoneda</option>
                <option value="cash" ${asset.type === 'cash' ? 'selected' : ''}>Efectivo</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label">Divisa</label>
            <select class="form-control" name="currency">
                <option value="USD" ${asset.currency === 'USD' ? 'selected' : ''}>USD</option>
                <option value="EUR" ${asset.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                <option value="COP" ${asset.currency === 'COP' ? 'selected' : ''}>COP</option>
                <option value="MXN" ${asset.currency === 'MXN' ? 'selected' : ''}>MXN</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label">Notas</label>
            <textarea class="form-control" name="notes">${asset.notes || ''}</textarea>
        </div>
    `;
    document.getElementById('editAssetModalBody').innerHTML = html;
    new bootstrap.Modal(document.getElementById('editAssetModal')).show();
};

window.deleteAsset = function(idx) {
    if (confirm('¿Estás seguro de que quieres eliminar este activo?')) {
        portfolioData.splice(idx, 1);
        localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
        renderPortfolio();
        showAlert("Activo eliminado correctamente", "success");
    }
};

window.viewDetails = function(idx) {
    const asset = portfolioData[idx];
    const totalValue = portfolioData.reduce((sum, a) => sum + (a.value || 0), 0);
    const peso = totalValue ? ((asset.value || 0) / totalValue * 100).toFixed(2) : "0.00";
    
    let html = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="fw-bold">Información Básica</h6>
                <ul class="list-group list-group-flush">
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>Nombre:</strong> 
                        <span>${asset.name || asset.crypto_name || "Efectivo"}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>Ticker:</strong> 
                        <span>${asset.ticker || "-"}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>ISIN:</strong> 
                        <span>${asset.isin || "-"}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>Tipo:</strong> 
                        <span class="badge bg-secondary">${asset.type || 'stock'}</span>
                    </li>
                </ul>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold">Información Financiera</h6>
                <ul class="list-group list-group-flush">
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>Cantidad:</strong> 
                        <span>${asset.quantity || asset.amount || "-"}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>Precio Compra:</strong> 
                        <span>${asset.purchase_price ? formatCurrency(asset.purchase_price) : "-"}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>Precio Actual:</strong> 
                        <span>${asset.current_price !== undefined ? formatCurrency(asset.current_price) : (asset.priceError || "-")}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>Valor Total:</strong> 
                        <span class="fw-bold">${asset.value !== undefined ? formatCurrency(asset.value) : "-"}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>Peso en Portafolio:</strong> 
                        <span class="fw-bold">${peso}%</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <strong>Ganancia/Pérdida:</strong> 
                        <span class="fw-bold ${(asset.profit || 0) < 0 ? "text-danger" : "text-success"}">${asset.profit !== undefined ? formatCurrency(asset.profit) : "-"}</span>
                    </li>
                </ul>
            </div>
        </div>
    `;
    
    if (asset.notes || asset.broker || asset.purchase_date) {
        html += `
            <hr>
            <h6 class="fw-bold">Información Adicional</h6>
            <ul class="list-group list-group-flush">
        `;
        if (asset.notes) html += `<li class="list-group-item"><strong>Notas:</strong> ${asset.notes}</li>`;
        if (asset.broker) html += `<li class="list-group-item"><strong>Broker:</strong> ${asset.broker}</li>`;
        if (asset.purchase_date) html += `<li class="list-group-item"><strong>Fecha de compra:</strong> ${asset.purchase_date}</li>`;
        html += `</ul>`;
    }
    
    document.getElementById('assetDetailsModalBody').innerHTML = html;
    new bootstrap.Modal(document.getElementById('assetDetailsModal')).show();
};

// =======================
// EVENT LISTENERS ULTRA MEJORADOS
// =======================

// Búsqueda por ISIN
document.getElementById('searchByISINBtn').addEventListener('click', function() {
    const isin = document.getElementById('isinSearchInput').value.trim();
    if (isin) {
        searchByISIN(isin);
    } else {
        showAlert('Por favor ingresa un ISIN válido', 'warning');
    }
});

document.getElementById('isinSearchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('searchByISINBtn').click();
    }
});

// Agregar activo ultra mejorado
document.getElementById("addAssetForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const form = e.target;
    
    const cryptoIdField = document.getElementById('crypto_id');
    const assetType = cryptoIdField && cryptoIdField.value ? 'crypto' : 'stock';
    
    const asset = {
        name: form.name.value,
        ticker: form.ticker.value,
        isin: form.isin.value,
        quantity: parseFloat(form.quantity.value),
        purchase_price: parseFloat(form.purchase_price.value),
        currency: form.currency.value,
        commission: parseFloat(form.commission.value) || 0,
        notes: form.notes.value,
        broker: form.broker.value,
        purchase_date: form.purchase_date.value,
        type: assetType,
        dateAdded: new Date().toISOString()
    };
    
    if (assetType === 'crypto' && cryptoIdField) {
        asset.crypto_id = cryptoIdField.value;
        asset.name_id = cryptoIdField.value;
    }
    
    portfolioData.push(asset);
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    
    // Limpiar formulario y crypto_id
    form.reset();
    if (cryptoIdField) cryptoIdField.remove();
    
    // Cerrar modal de crypto si está abierto
    const cryptoModal = document.getElementById('cryptoSelectorModal');
    if (cryptoModal) {
        bootstrap.Modal.getInstance(cryptoModal).hide();
    }
    
    renderPortfolio();
    showAlert(`${asset.name} agregado al portafolio correctamente`, "success");
});

// Editar activo
document.getElementById('editAssetForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = e.target;
    const idx = parseInt(form.idx.value);
    
    portfolioData[idx] = {
        ...portfolioData[idx],
        name: form.name.value,
        ticker: form.ticker.value,
        isin: form.isin.value,
        quantity: parseFloat(form.quantity.value),
        purchase_price: parseFloat(form.purchase_price.value),
        type: form.type.value,
        currency: form.currency.value,
        notes: form.notes.value
    };
    
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    bootstrap.Modal.getInstance(document.getElementById('editAssetModal')).hide();
    renderPortfolio();
    showAlert("Activo actualizado correctamente", "success");
});

// Actualizar precios
document.getElementById('updateAllPricesBtn').addEventListener('click', updateAllPrices);

// Botones de período del gráfico
document.getElementById('chart7d').addEventListener('click', () => filterPortfolioHistory(7));
document.getElementById('chart30d').addEventListener('click', () => filterPortfolioHistory(30));
document.getElementById('chart90d').addEventListener('click', () => filterPortfolioHistory(90));
document.getElementById('chart1y').addEventListener('click', () => filterPortfolioHistory(365));

function filterPortfolioHistory(days) {
    // Actualizar botones activos
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    
    if (days === 7) document.getElementById('chart7d').classList.add('btn-primary');
    else if (days === 30) document.getElementById('chart30d').classList.add('btn-primary');
    else if (days === 90) document.getElementById('chart90d').classList.add('btn-primary');
    else if (days === 365) document.getElementById('chart1y').classList.add('btn-primary');
    
    // Filtrar datos y actualizar gráfico
    const filteredHistory = portfolioHistory.slice(-days);
    const originalHistory = portfolioHistory;
    portfolioHistory = filteredHistory;
    updatePerformanceChart();
    portfolioHistory = originalHistory;
}

// Exportar portafolio
document.getElementById('exportPortfolioBtn').addEventListener('click', function() {
    const data = {
        portfolio: portfolioData,
        history: portfolioHistory,
        exported: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackerfolio-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showAlert('Portafolio exportado correctamente', 'success');
});

// Toggle más detalles
document.getElementById('toggleDetailsAsset').addEventListener('click', function() {
    const details = document.getElementById('assetDetails');
    if (details.style.display === 'none') {
        details.style.display = 'block';
        this.innerHTML = '- Menos Detalle';
    } else {
        details.style.display = 'none';
        this.innerHTML = '+ Más Detalle';
    }
});

// Modo oscuro
document.getElementById('toggleThemeBtn').addEventListener('click', function(e) {
    e.preventDefault();
    document.body.classList.toggle('dark-mode');
    const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    
    const icon = this.querySelector('i');
    const span = this.querySelector('span') || this;
    
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        span.textContent = 'Modo Claro';
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        span.textContent = 'Modo Oscuro';
    }
});

// Aplicar tema guardado al cargar
window.addEventListener('DOMContentLoaded', () => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('toggleThemeBtn');
        if (btn) {
            const icon = btn.querySelector('i');
            const span = btn.querySelector('span') || btn;
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            span.textContent = 'Modo Claro';
        }
    }
});

// =======================
// CSS DINÁMICO PARA CRYPTO CARDS
// =======================
const cryptoStyles = document.createElement('style');
cryptoStyles.textContent = `
    .crypto-card {
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid transparent;
    }
    .crypto-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        border-color: var(--primary-color);
    }
    .crypto-logo {
        width: 40px;
        height: 40px;
        border-radius: 50%;
    }
    #cryptoSelectorModal .modal-dialog {
        max-width: 800px;
    }
`;
document.head.appendChild(cryptoStyles);

// =======================
// INICIALIZACIÓN ULTRA AVANZADA
// =======================
renderPortfolio();
updatePerformanceChart();

// Auto-actualizar precios cada 5 minutos
setInterval(() => {
    if (portfolioData.length > 0) {
        updateAllPrices();
    }
}, 5 * 60 * 1000);

console.log('TrackyFi Ultra Advanced Portfolio Manager v2.0 iniciado correctamente! 🚀');