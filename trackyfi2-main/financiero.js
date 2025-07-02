// =======================
// ESTADO FINANCIERO MEJORADO
// =======================

let financialTrendsChart = null;

async function fetchYahooFinancials(symbol) {
    const url = `https://trackerfolio.com:5000/api/estado/${symbol}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("No se pudo obtener información financiera.");
        return await res.json();
    } catch (error) {
        console.error('Error fetching financials:', error);
        throw error;
    }
}

function safe(val) {
    return (val !== undefined && val !== null) ? Number(val).toLocaleString() : '<span class="text-danger fw-bold">N/D</span>';
}

function ratio(n, d) {
    if (n === null || n === undefined || d === null || d === undefined || d === 0) {
        return '<span class="text-danger fw-bold">N/D</span>';
    }
    const result = (n / d).toFixed(4);
    const value = parseFloat(result);
    const colorClass = value > 0 ? 'text-success' : value < 0 ? 'text-danger' : 'text-warning';
    return `<span class="${colorClass} fw-bold">${result}</span>`;
}

function buildTable(fields, periods, title = "") {
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th class="fw-bold">${title || 'Cuenta'}</th>
    `;
    periods.forEach(p => html += `<th class="text-center fw-bold">${p}</th>`);
    html += `</tr></thead><tbody>`;
    
    fields.forEach(f => {
        html += `<tr><td class="fw-semibold">${f.label}</td>`;
        periods.forEach((p, i) => {
            const value = f.values[i];
            const formattedValue = safe(value);
            html += `<td class="text-center">${formattedValue}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
}

function showLoadingState(elementId) {
    document.getElementById(elementId).innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2 text-muted">Obteniendo datos financieros...</p>
        </div>
    `;
}

function updateFinancialTrendsChart(data) {
    const ctx = document.getElementById('financialTrendsChart');
    if (!ctx) return;
    
    if (financialTrendsChart) {
        financialTrendsChart.destroy();
    }
    
    const incomeArr = data?.incomeStatementHistory?.incomeStatementHistory || [];
    const periods = incomeArr.map(e => e.endDate ? new Date(e.endDate.raw * 1000).getFullYear() : 'N/D');
    
    const revenues = incomeArr.map(e => e.totalRevenue?.raw || 0);
    const profits = incomeArr.map(e => e.netIncome?.raw || 0);
    
    financialTrendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: periods,
            datasets: [{
                label: 'Ingresos Totales',
                data: revenues,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: false,
                tension: 0.4
            }, {
                label: 'Beneficio Neto',
                data: profits,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: false,
                tension: 0.4
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
                            return `${context.dataset.label}: $${(context.parsed.y / 1000000000).toFixed(2)}B`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + (value / 1000000000).toFixed(1) + 'B';
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
}

async function loadFinancials() {
    const symbol = document.getElementById('symbolInput').value.trim() || 'AAPL';
    const viewMode = document.querySelector('input[name="viewMode"]:checked')?.value || 'anual';
    
    document.getElementById('symbolTitle').textContent = symbol.toUpperCase();
    
    // Mostrar estados de carga
    showLoadingState('ratios');
    showLoadingState('incomeTable');
    showLoadingState('balanceTable');
    showLoadingState('cashflowTable');

    try {
        const data = await fetchYahooFinancials(symbol);

        if (!data.incomeStatementHistory || !data.incomeStatementHistory.incomeStatementHistory || data.incomeStatementHistory.incomeStatementHistory.length === 0) {
            const errorMessage = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    No se encontró información financiera para el símbolo <strong>${symbol.toUpperCase()}</strong>. 
                    <br>Prueba con otro símbolo (ej: AAPL, MSFT, TSLA, GOOGL).
                </div>
            `;
            document.getElementById('ratios').innerHTML = errorMessage;
            document.getElementById('incomeTable').innerHTML = '';
            document.getElementById('balanceTable').innerHTML = '';
            document.getElementById('cashflowTable').innerHTML = '';
            return;
        }

        // Extraer periodos
        const periods = (data?.incomeStatementHistory?.incomeStatementHistory || []).map(e =>
            e.endDate ? new Date(e.endDate.raw * 1000).getFullYear() : 'N/D'
        );

        function extract(field, arr) {
            return arr.map(e => e[field]?.raw ?? null);
        }

        const incomeArr = data?.incomeStatementHistory?.incomeStatementHistory || [];
        const balanceArr = data?.balanceSheetHistory?.balanceSheetStatements || [];
        const cashArr = data?.cashflowStatementHistory?.cashflowStatements || [];

        // Estados financieros
        const incomeFields = [
            { label: "Ingresos Totales", values: extract("totalRevenue", incomeArr) },
            { label: "Costo de Ventas", values: extract("costOfRevenue", incomeArr) },
            { label: "Beneficio Bruto", values: extract("grossProfit", incomeArr) },
            { label: "Gastos Operativos", values: extract("totalOperatingExpenses", incomeArr) },
            { label: "Beneficio Operativo", values: extract("operatingIncome", incomeArr) },
            { label: "Beneficio Neto", values: extract("netIncome", incomeArr) },
            { label: "EBITDA", values: extract("ebitda", incomeArr) },
            { label: "BPA Básico", values: extract("basicEPS", incomeArr) },
            { label: "BPA Diluido", values: extract("dilutedEPS", incomeArr) }
        ];

        const balanceFields = [
            { label: "Total Activos", values: extract("totalAssets", balanceArr) },
            { label: "Total Pasivos", values: extract("totalLiab", balanceArr) },
            { label: "Patrimonio Total", values: extract("totalStockholderEquity", balanceArr) },
            { label: "Deuda a Largo Plazo", values: extract("longTermDebt", balanceArr) },
            { label: "Efectivo y Equivalentes", values: extract("cash", balanceArr) },
            { label: "Inventario", values: extract("inventory", balanceArr) }
        ];

        const cashFields = [
            { label: "Flujo de Caja Operativo", values: extract("totalCashFromOperatingActivities", cashArr) },
            { label: "Flujo de Caja de Inversión", values: extract("totalCashflowsFromInvestingActivities", cashArr) },
            { label: "Flujo de Caja de Financiación", values: extract("totalCashFromFinancingActivities", cashArr) },
            { label: "Cambio en Efectivo", values: extract("changeInCash", cashArr) }
        ];

        // Renderizar tablas
        document.getElementById('incomeTable').innerHTML = buildTable(incomeFields, periods, "Estado de Resultados");
        document.getElementById('balanceTable').innerHTML = buildTable(balanceFields, periods, "Balance General");
        document.getElementById('cashflowTable').innerHTML = buildTable(cashFields, periods, "Flujo de Caja");

        // Ratios financieros mejorados
        let ratiosHTML = '';
        for (let i = 0; i < periods.length; i++) {
            const revenue = incomeFields[0].values[i];
            const netIncome = incomeFields[5].values[i];
            const ebitda = incomeFields[6].values[i];
            const grossProfit = incomeFields[2].values[i];
            const totalAssets = balanceFields[0].values[i];
            const totalLiab = balanceFields[1].values[i];
            const equity = balanceFields[2].values[i];
            const cashOp = cashFields[0].values[i];

            ratiosHTML += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card h-100 shadow-sm border-0">
                        <div class="card-body">
                            <h6 class="card-title text-primary fw-bold mb-3">
                                <i class="fas fa-calendar-alt me-2"></i>${periods[i]}
                            </h6>
                            <div class="row g-2">
                                <div class="col-12">
                                    <div class="ratio-item">
                                        <span class="ratio-label">💰 Margen Neto:</span>
                                        <span class="ratio-value">${ratio(netIncome, revenue)}</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="ratio-item">
                                        <span class="ratio-label">📈 ROE:</span>
                                        <span class="ratio-value">${ratio(netIncome, equity)}</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="ratio-item">
                                        <span class="ratio-label">🏦 Deuda/Activos:</span>
                                        <span class="ratio-value">${ratio(totalLiab, totalAssets)}</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="ratio-item">
                                        <span class="ratio-label">⚖️ Deuda/Patrimonio:</span>
                                        <span class="ratio-value">${ratio(totalLiab, equity)}</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="ratio-item">
                                        <span class="ratio-label">📊 Margen Bruto:</span>
                                        <span class="ratio-value">${ratio(grossProfit, revenue)}</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="ratio-item">
                                        <span class="ratio-label">💼 EBITDA/Ingresos:</span>
                                        <span class="ratio-value">${ratio(ebitda, revenue)}</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="ratio-item">
                                        <span class="ratio-label">💵 FCO/Ingresos:</span>
                                        <span class="ratio-value">${ratio(cashOp, revenue)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        document.getElementById('ratios').innerHTML = ratiosHTML || '<div class="alert alert-warning">No hay ratios disponibles.</div>';

        // Actualizar gráfico de tendencias
        updateFinancialTrendsChart(data);

        // Actualizar comparación con industria (valores simulados)
        updateIndustryComparison(netIncome[0], equity[0], revenue[0]);

    } catch (e) {
        console.error('Error loading financials:', e);
        const errorMessage = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                No se pudo obtener información financiera para este símbolo.
                <br><small class="text-muted">Error: ${e.message}</small>
            </div>
        `;
        document.getElementById('ratios').innerHTML = errorMessage;
        document.getElementById('incomeTable').innerHTML = '';
        document.getElementById('balanceTable').innerHTML = '';
        document.getElementById('cashflowTable').innerHTML = '';
    }
}

function updateIndustryComparison(netIncome, equity, revenue) {
    // Valores simulados para la comparación con la industria
    const companyPE = revenue ? (netIncome / revenue * 100).toFixed(2) : '--';
    const companyROE = equity ? (netIncome / equity * 100).toFixed(2) : '--';
    
    // Valores promedio de la industria (simulados)
    const industryPE = '15.2';
    const industryROE = '12.5';
    
    document.getElementById('companyPE').textContent = companyPE + '%';
    document.getElementById('industryPE').textContent = industryPE + '%';
    document.getElementById('companyROE').textContent = companyROE + '%';
    document.getElementById('industryROE').textContent = industryROE + '%';
    
    // Agregar clases de color basadas en la comparación
    const peElement = document.getElementById('companyPE');
    const roeElement = document.getElementById('companyROE');
    
    if (parseFloat(companyPE) > parseFloat(industryPE)) {
        peElement.className = 'company-value text-success fw-bold';
    } else {
        peElement.className = 'company-value text-danger fw-bold';
    }
    
    if (parseFloat(companyROE) > parseFloat(industryROE)) {
        roeElement.className = 'company-value text-success fw-bold';
    } else {
        roeElement.className = 'company-value text-danger fw-bold';
    }
}

// Event Listeners
window.addEventListener('load', loadFinancials);

// Agregar CSS adicional para los ratios
const style = document.createElement('style');
style.textContent = `
    .ratio-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid rgba(0,0,0,0.1);
    }
    .ratio-item:last-child {
        border-bottom: none;
    }
    .ratio-label {
        font-size: 0.9rem;
        color: #6b7280;
    }
    .ratio-value {
        font-weight: bold;
        font-size: 0.9rem;
    }
    .comparison-metric {
        padding: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
    }
    .metric-name {
        font-weight: bold;
        margin-bottom: 0.5rem;
        color: #374151;
    }
    .metric-comparison {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .company-value, .industry-value {
        font-weight: bold;
        font-size: 1.1rem;
    }
    .vs-text {
        color: #6b7280;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style);