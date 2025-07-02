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
// VARIABLES Y CONSTANTES MEJORADAS
// =======================
const EOD_API_KEY = "685dbffc6fc317.12238654";
const OPENFIGI_API_KEY = "f4ae7665-74e9-41e9-bc73-3764b37f2d2d";
const ALPHA_VANTAGE_API_KEY = "demo"; // Reemplazar con tu API key real

let portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '[]');
let portfolioHistory = JSON.parse(localStorage.getItem('portfolioHistory') || '[]');
let performanceChart = null;
let assetDistributionChart = null;
let typeDistributionChart = null;
let dividendHistoryChart = null;

// =======================
// UTILIDADES MEJORADAS
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
// BÚSQUEDA AVANZADA POR ISIN
// =======================
async function searchByISIN(isin) {
    const loadingSpinner = document.getElementById('isinLoadingSpinner');
    const resultsDiv = document.getElementById('isinSearchResults');
    
    loadingSpinner.classList.remove('d-none');
    resultsDiv.innerHTML = '';

    try {
        // Primero buscar en OpenFIGI para obtener información del activo
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
            
            // Mostrar resultados
            resultsDiv.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">${assetInfo.name || 'Activo encontrado'}</h6>
                        <div class="row">
                            <div class="col-md-6">
                                <p class="mb-1"><strong>Ticker:</strong> ${ticker}</p>
                                <p class="mb-1"><strong>ISIN:</strong> ${isin}</p>
                                <p class="mb-1"><strong>Mercado:</strong> ${assetInfo.exchCode || 'N/A'}</p>
                            </div>
                            <div class="col-md-6">
                                <p class="mb-1"><strong>Precio Actual:</strong> ${price ? formatCurrency(price) : 'No disponible'}</p>
                                <p class="mb-1"><strong>Tipo:</strong> ${assetInfo.securityType || 'N/A'}</p>
                                <p class="mb-1"><strong>Moneda:</strong> ${assetInfo.tradingCurrency || 'USD'}</p>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm mt-2" onclick="addAssetFromSearch('${assetInfo.name || ticker}', '${ticker}', '${isin}', ${price || 0}, '${assetInfo.tradingCurrency || 'USD'}')">
                            <i class="fas fa-plus me-1"></i>Agregar al Portafolio
                        </button>
                    </div>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    No se encontró información para el ISIN: ${isin}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching ISIN:', error);
        resultsDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error al buscar el ISIN. Inténtalo de nuevo.
            </div>
        `;
    } finally {
        loadingSpinner.classList.add('d-none');
    }
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
// API CALLS MEJORADAS
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

// =======================
// ACTUALIZACIÓN DE PRECIOS MEJORADA
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
                const cryptoId = asset.name_id || asset.ticker.toLowerCase();
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
// GRÁFICO DE RENDIMIENTO PONDERADO ULTRA AVANZADO
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
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valor del Portafolio',
                data: values,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6
            }, {
                label: 'Rendimiento (%)',
                data: returns,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: false,
                tension: 0.4,
                yAxisID: 'y1',
                pointRadius: 2
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
// GRÁFICOS DE DISTRIBUCIÓN
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
                borderWidth: 2,
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
    
    typeDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Acciones', 'Criptomonedas', 'Efectivo'],
            datasets: [{
                label: 'Distribución por Tipo (%)',
                data: data,
                backgroundColor: ['#4f46e5', '#f59e0b', '#10b981'],
                borderColor: ['#3730a3', '#d97706', '#059669'],
                borderWidth: 2
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
                    }
                }
            }
        }
    });
}

// =======================
// RENDERIZADO DE PORTAFOLIO MEJORADO
// =======================
function renderPortfolio() {
    const container = document.getElementById("portfolioContent");
    if (!portfolioData.length) {
        container.innerHTML = `
            <div class="empty-portfolio text-center py-5">
                <i class="fas fa-chart-pie fa-4x text-muted mb-3"></i>
                <h4>Tu portafolio está vacío</h4>
                <p class="text-muted">Comienza agregando tus primeros activos usando el buscador ISIN o el formulario de arriba</p>
                <button class="btn btn-primary" onclick="document.getElementById('isinSearchInput').focus()">
                    <i class="fas fa-search me-2"></i>Buscar por ISIN
                </button>
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
        const dividendosEst = (asset.value || 0) * 0.03; // Estimación 3% anual
        
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

        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="asset-icon me-2">
                            <i class="fas fa-${asset.type === 'crypto' ? 'bitcoin' : asset.type === 'cash' ? 'wallet' : 'chart-line'}"></i>
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
// ESTADÍSTICAS MEJORADAS
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
// FUNCIONES DE ACTIVOS
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
// EVENT LISTENERS
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

// Agregar activo
document.getElementById("addAssetForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const form = e.target;
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
        type: "stock",
        dateAdded: new Date().toISOString()
    };
    
    portfolioData.push(asset);
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    form.reset();
    
    // Actualizar precio inmediatamente
    await actualizarPrecioIndividual(asset);
    renderPortfolio();
    showAlert("Activo agregado correctamente", "success");
});

// Editar activo
document.getElementById('editAssetForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = e.target;
    const idx = parseInt(form.idx.value);
    const asset = portfolioData[idx];
    
    asset.name = form.name.value;
    asset.crypto_name = form.name.value;
    asset.ticker = form.ticker.value;
    asset.isin = form.isin.value;
    asset.quantity = parseFloat(form.quantity.value) || asset.quantity || asset.amount;
    asset.amount = asset.quantity;
    asset.purchase_price = parseFloat(form.purchase_price.value) || asset.purchase_price;
    asset.currency = form.currency.value;
    asset.notes = form.notes.value;
    asset.lastModified = new Date().toISOString();
    
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    renderPortfolio();
    bootstrap.Modal.getInstance(document.getElementById('editAssetModal')).hide();
    showAlert("Activo modificado correctamente", "success");
});

// Actualizar todos los precios
document.getElementById("updateAllPricesBtn").addEventListener("click", updateAllPrices);

// Exportar portafolio
document.getElementById("exportPortfolioBtn").addEventListener("click", function() {
    const dataStr = JSON.stringify(portfolioData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showAlert("Portafolio exportado correctamente", "success");
});

// Toggle detalles del formulario
document.getElementById('toggleDetailsAsset').addEventListener('click', function() {
    const details = document.getElementById('assetDetails');
    if (details.style.display === 'none') {
        details.style.display = 'block';
        this.textContent = '- Menos Detalle';
    } else {
        details.style.display = 'none';
        this.textContent = '+ Más Detalle';
    }
});

// Modo oscuro
document.getElementById('toggleThemeBtn').addEventListener('click', function (e) {
    e.preventDefault();
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    
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
// FUNCIÓN AUXILIAR PARA ACTUALIZAR PRECIO INDIVIDUAL
// =======================
async function actualizarPrecioIndividual(asset) {
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
            const cryptoId = asset.name_id || asset.ticker.toLowerCase();
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
        console.error('Error updating individual price:', error);
        asset.priceError = 'Error al actualizar precio.';
    }
    
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
}

// =======================
// INICIALIZACIÓN
// =======================
renderPortfolio();
updatePerformanceChart();