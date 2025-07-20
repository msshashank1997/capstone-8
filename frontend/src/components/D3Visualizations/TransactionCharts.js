import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const TransactionCharts = ({ transactions, selectedCurrency = 'all', exchangeRates = {} }) => {
  const pieChartRef = useRef();
  const barChartRef = useRef();
  const timelineChartRef = useRef();

  // Process transaction data for visualization
  const processTransactionData = () => {
    if (!transactions || transactions.length === 0) {
      return {
        categoryData: [],
        monthlyData: [],
        timelineData: []
      };
    }

    // Helper function to convert currency
    const convertAmount = (amount, fromCurrency) => {
      if (selectedCurrency === 'all' || selectedCurrency === fromCurrency) {
        return amount;
      }
      if (exchangeRates[selectedCurrency] && exchangeRates[fromCurrency]) {
        const usdAmount = amount / (exchangeRates[fromCurrency] || 1);
        return usdAmount * exchangeRates[selectedCurrency];
      }
      return amount;
    };

    // Category breakdown (expenses only)
    const categoryTotals = {};
    const monthlyTotals = {};
    const timelineData = [];

    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.originalAmount || transaction.amount);
      const currency = transaction.originalCurrency || transaction.currency || 'USD';
      const convertedAmount = convertAmount(amount, currency);
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Category data (expenses only)
      if (transaction.type === 'expense') {
        const category = transaction.category || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + convertedAmount;
      }

      // Monthly data
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expense: 0, month: monthKey };
      }
      
      if (transaction.type === 'income') {
        monthlyTotals[monthKey].income += convertedAmount;
      } else {
        monthlyTotals[monthKey].expense += convertedAmount;
      }

      // Timeline data
      timelineData.push({
        date: date,
        amount: transaction.type === 'income' ? convertedAmount : -convertedAmount,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description
      });
    });

    return {
      categoryData: Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount
      })),
      monthlyData: Object.values(monthlyTotals).sort((a, b) => a.month.localeCompare(b.month)),
      timelineData: timelineData.sort((a, b) => a.date - b.date)
    };
  };

  const { categoryData, monthlyData, timelineData } = processTransactionData();

  // Pie Chart for Expense Categories
  useEffect(() => {
    if (!categoryData.length) return;

    const container = d3.select(pieChartRef.current);
    container.selectAll("*").remove();

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie()
      .value(d => d.amount)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius - 10);

    const labelArc = d3.arc()
      .outerRadius(radius - 40)
      .innerRadius(radius - 40);

    const arcs = g.selectAll(".arc")
      .data(pie(categoryData))
      .enter().append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .style("fill", d => color(d.data.category))
      .style("stroke", "#fff")
      .style("stroke-width", "2px")
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 0.7);
        
        // Tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "d3-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", 1000);

        tooltip.html(`${d.data.category}: $${d.data.amount.toFixed(2)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 1);
        d3.selectAll(".d3-tooltip").remove();
      });

    arcs.append("text")
      .attr("transform", d => `translate(${labelArc.centroid(d)})`)
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#333")
      .text(d => d.data.amount > 0 ? d.data.category : "");

  }, [categoryData]);

  // Bar Chart for Monthly Income vs Expenses
  useEffect(() => {
    if (!monthlyData.length) return;

    const container = d3.select(barChartRef.current);
    container.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand()
      .rangeRound([0, width])
      .paddingInner(0.1)
      .domain(monthlyData.map(d => d.month));

    const x1 = d3.scaleBand()
      .padding(0.05)
      .domain(['income', 'expense'])
      .rangeRound([0, x0.bandwidth()]);

    const y = d3.scaleLinear()
      .rangeRound([height, 0])
      .domain([0, d3.max(monthlyData, d => Math.max(d.income, d.expense))]);

    const color = d3.scaleOrdinal()
      .domain(['income', 'expense'])
      .range(['#10B981', '#EF4444']);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      .style("font-size", "10px");

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "10px");

    // Income bars
    g.selectAll(".income-bar")
      .data(monthlyData)
      .enter().append("rect")
      .attr("class", "income-bar")
      .attr("x", d => x0(d.month) + x1('income'))
      .attr("y", d => y(d.income))
      .attr("width", x1.bandwidth())
      .attr("height", d => height - y(d.income))
      .attr("fill", color('income'))
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 0.7);
        
        const tooltip = d3.select("body").append("div")
          .attr("class", "d3-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", 1000);

        tooltip.html(`Income ${d.month}: $${d.income.toFixed(2)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 1);
        d3.selectAll(".d3-tooltip").remove();
      });

    // Expense bars
    g.selectAll(".expense-bar")
      .data(monthlyData)
      .enter().append("rect")
      .attr("class", "expense-bar")
      .attr("x", d => x0(d.month) + x1('expense'))
      .attr("y", d => y(d.expense))
      .attr("width", x1.bandwidth())
      .attr("height", d => height - y(d.expense))
      .attr("fill", color('expense'))
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 0.7);
        
        const tooltip = d3.select("body").append("div")
          .attr("class", "d3-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", 1000);

        tooltip.html(`Expenses ${d.month}: $${d.expense.toFixed(2)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 1);
        d3.selectAll(".d3-tooltip").remove();
      });

    // Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 100}, 20)`);

    const legendData = [
      { type: 'income', color: color('income'), label: 'Income' },
      { type: 'expense', color: color('expense'), label: 'Expenses' }
    ];

    legend.selectAll(".legend-item")
      .data(legendData)
      .enter().append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`)
      .each(function(d) {
        const item = d3.select(this);
        item.append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", d.color);
        
        item.append("text")
          .attr("x", 16)
          .attr("y", 9)
          .style("font-size", "11px")
          .style("fill", "#333")
          .text(d.label);
      });

  }, [monthlyData]);

  // Timeline Chart
  useEffect(() => {
    if (!timelineData.length) return;

    const container = d3.select(timelineChartRef.current);
    container.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Calculate cumulative balance
    let cumulativeBalance = 0;
    const cumulativeData = timelineData.map(d => {
      cumulativeBalance += d.amount;
      return {
        ...d,
        cumulativeBalance
      };
    });

    const x = d3.scaleTime()
      .domain(d3.extent(cumulativeData, d => d.date))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain(d3.extent(cumulativeData, d => d.cumulativeBalance))
      .nice()
      .range([height, 0]);

    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.cumulativeBalance))
      .curve(d3.curveMonotoneX);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%m/%y")))
      .selectAll("text")
      .style("font-size", "10px")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "10px");

    // Zero line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", y(0))
      .attr("y2", y(0))
      .style("stroke", "#999")
      .style("stroke-dasharray", "3,3");

    // Balance line
    g.append("path")
      .datum(cumulativeData)
      .attr("fill", "none")
      .attr("stroke", "#3B82F6")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Data points
    g.selectAll(".dot")
      .data(cumulativeData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.cumulativeBalance))
      .attr("r", 3)
      .style("fill", d => d.type === 'income' ? '#10B981' : '#EF4444')
      .style("stroke", "#fff")
      .style("stroke-width", 1)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("r", 5);
        
        const tooltip = d3.select("body").append("div")
          .attr("class", "d3-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", 1000);

        tooltip.html(`
          ${d.description}<br/>
          ${d.type === 'income' ? '+' : '-'}$${Math.abs(d.amount).toFixed(2)}<br/>
          Balance: $${d.cumulativeBalance.toFixed(2)}<br/>
          ${d.date.toLocaleDateString()}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("r", 3);
        d3.selectAll(".d3-tooltip").remove();
      });

  }, [timelineData]);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No transaction data available. Add some transactions to see visualizations!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Categories Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Expense Categories
          </h3>
          {categoryData.length > 0 ? (
            <div ref={pieChartRef} className="flex justify-center"></div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No expense data available
            </p>
          )}
        </div>

        {/* Monthly Income vs Expenses Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Income vs Expenses
          </h3>
          {monthlyData.length > 0 ? (
            <div ref={barChartRef} className="flex justify-center"></div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No monthly data available
            </p>
          )}
        </div>
      </div>

      {/* Balance Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Balance Timeline
        </h3>
        {timelineData.length > 0 ? (
          <div ref={timelineChartRef} className="flex justify-center"></div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No timeline data available
          </p>
        )}
      </div>
    </div>
  );
};

export default TransactionCharts;
