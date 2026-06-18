import React from 'react';

interface CustomChartProps {
  data: any[];
}

export default function CustomChart({ data }: CustomChartProps) {
  if (!data || data.length === 0) return null;

  // Identify columns
  const columns = Object.keys(data[0]);
  if (columns.length < 2) return null;

  // Classify columns
  const numericCols = columns.filter(c => typeof data[0][c] === 'number');
  const dateCols = columns.filter(c => {
    const val = String(data[0][c]).toLowerCase();
    return c.toLowerCase().includes('date') || c.toLowerCase().includes('month') || c.toLowerCase().includes('year') || val.match(/^\d{4}-\d{2}-\d{2}$/);
  });
  const catCols = columns.filter(c => !numericCols.includes(c) && !dateCols.includes(c));

  // Determine chart type
  let chartType: 'line' | 'pie' | 'bar' = 'bar';
  
  if (dateCols.length > 0 && numericCols.length > 0) {
    chartType = 'line';
  } else if (columns.length === 2 && data.length <= 6 && numericCols.length > 0) {
    chartType = 'pie';
  } else if (numericCols.length > 0) {
    chartType = 'bar';
  } else {
    return null;
  }

  // Common setups
  const width = 500;
  const height = 260;
  const padding = 45;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Extract variables
  let xKey = '';
  let yKey = '';

  if (chartType === 'line') {
    xKey = dateCols[0];
    yKey = numericCols[0];
    data = [...data].sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
  } else if (chartType === 'pie') {
    yKey = numericCols[0];
    xKey = catCols[0] || columns.find(c => c !== yKey) || '';
  } else {
    yKey = numericCols[0];
    xKey = catCols[0] || dateCols[0] || columns.find(c => c !== yKey) || '';
  }

  const yValues = data.map(d => Number(d[yKey]) || 0);
  const yMax = Math.max(...yValues, 1) * 1.15;
  const yMin = 0;

  // High-fidelity active theme color swatches mapping
  const palette = [
    'var(--bio-teal)', 
    'var(--bio-coral)', 
    'var(--bio-lime)', 
    '#00FFCC', 
    '#FFA07A', 
    '#8A5CF5'
  ];

  // Grid color
  const gridStroke = "rgba(255, 255, 255, 0.06)";
  const axisStroke = "rgba(255, 255, 255, 0.15)";

  // 1) BAR CHART
  if (chartType === 'bar') {
    const barWidth = Math.min((chartWidth / data.length) * 0.65, 36);
    const stepX = chartWidth / data.length;

    return (
      <div className="bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] border border-white/[0.01] p-5 mt-4 rounded-2xl relative overflow-hidden">
        <h4 className="text-xs text-[var(--bio-ghost)] tracking-[1.5px] uppercase mb-1 font-bold">
          📊 {yKey} BY {xKey}
        </h4>
        <div className="text-[8.5px] text-[var(--bio-teal)] mb-4 tracking-[1px] font-bold font-mono">
          COGNITIVE MATRIX GRAPH • LOCAL SHIELD COMPILER
        </div>
        
        <div className="relative w-full h-[260px] flex items-center justify-center">
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            {/* Grid Y Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => {
              const yVal = padding + chartHeight * (1 - val);
              const gridText = Math.round(yMax * val);
              return (
                <g key={idx}>
                  <line 
                    x1={padding} 
                    y1={yVal} 
                    x2={width - padding} 
                    y2={yVal} 
                    stroke={gridStroke} 
                    strokeDasharray="3 3" 
                  />
                  <text 
                    x={padding - 10} 
                    y={yVal + 3} 
                    fill="var(--bio-dim)" 
                    fontSize="8.5" 
                    fontFamily="var(--font-code)" 
                    textAnchor="end"
                  >
                    {gridText}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {data.map((item, idx) => {
              const val = Number(item[yKey]) || 0;
              const barHeight = (val / yMax) * chartHeight;
              const xPos = padding + idx * stepX + (stepX - barWidth) / 2;
              const yPos = height - padding - barHeight;
              const label = String(item[xKey]).substring(0, 10);
              const barColor = palette[idx % palette.length];

              return (
                <g key={idx} className="group cursor-pointer">
                  {/* Clean Neumorphic Raised Styled Bar */}
                  <rect
                    x={xPos}
                    y={yPos}
                    width={barWidth}
                    height={barHeight}
                    fill={barColor}
                    rx="4"
                    opacity="0.85"
                    className="transition-all duration-200 hover:opacity-100 hover:scale-x-[1.05]"
                  />
                  
                  {/* Tooltip value */}
                  <text
                    x={xPos + barWidth / 2}
                    y={yPos - 6}
                    fill="var(--bio-teal)"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="var(--font-code)"
                    textAnchor="middle"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    {val.toLocaleString()}
                  </text>

                  {/* X Axis Label */}
                  <text
                    x={xPos + barWidth / 2}
                    y={height - padding + 16}
                    fill="var(--bio-dim)"
                    fontSize="8.5"
                    fontFamily="var(--font-code)"
                    textAnchor="middle"
                    transform={`rotate(-22, ${xPos + barWidth / 2}, ${height - padding + 16})`}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Axis Lines */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={axisStroke} strokeWidth="1.5" />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={axisStroke} strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    );
  }

  // 2) LINE CHART
  if (chartType === 'line') {
    const stepX = chartWidth / (data.length - 1 || 1);
    const points = data.map((item, idx) => {
      const val = Number(item[yKey]) || 0;
      const barHeight = (val / yMax) * chartHeight;
      const xPos = padding + idx * stepX;
      const yPos = height - padding - barHeight;
      return { x: xPos, y: yPos, val, label: String(item[xKey]) };
    });

    const pathD = points.length > 0 
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') 
      : '';

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return (
      <div className="bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] border border-white/[0.01] p-5 mt-4 rounded-2xl relative overflow-hidden">
        <h4 className="text-xs text-[var(--bio-ghost)] tracking-[1.5px] uppercase mb-1 font-bold">
          📈 TREND: {yKey} OVER {xKey}
        </h4>
        <div className="text-[8.5px] text-[var(--bio-lime)] mb-4 tracking-[1px] font-bold font-mono">
          SERIES DISK ANALYTICS • TEMPORAL MATRIX
        </div>
        
        <div className="relative w-full h-[260px] flex items-center justify-center">
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            {/* Grid Y Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => {
              const yVal = padding + chartHeight * (1 - val);
              const gridText = Math.round(yMax * val);
              return (
                <g key={idx}>
                  <line 
                    x1={padding} 
                    y1={yVal} 
                    x2={width - padding} 
                    y2={yVal} 
                    stroke={gridStroke} 
                    strokeDasharray="3 3" 
                  />
                  <text 
                    x={padding - 10} 
                    y={yVal + 3} 
                    fill="var(--bio-dim)" 
                    fontSize="8.5" 
                    fontFamily="var(--font-code)" 
                    textAnchor="end"
                  >
                    {gridText}
                  </text>
                </g>
              );
            })}

            {/* Accent Shadow Fill Area */}
            {points.length > 0 && (
              <path d={areaD} fill="var(--bio-teal)" fillOpacity="0.06" />
            )}

            {/* Glowing Accent Trend Line */}
            {points.length > 0 && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="var(--bio-teal)" 
                strokeWidth="3" 
                strokeLinecap="round"
              />
            )}

            {/* Points */}
            {points.map((p, idx) => {
              const displayLabel = p.label.length > 10 ? p.label.substring(5, 10) : p.label;
              return (
                <g key={idx} className="group cursor-pointer">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    fill="var(--neu-bg)"
                    stroke="var(--bio-teal)"
                    strokeWidth="2.5"
                    className="transition-all hover:scale-130"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="10"
                    fill="var(--bio-teal)"
                    fillOpacity="0.2"
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200"
                  />
                  
                  {/* Tooltip value */}
                  <text
                    x={p.x}
                    y={p.y - 12}
                    fill="var(--bio-ghost)"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="var(--font-code)"
                    textAnchor="middle"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    {p.val.toLocaleString()}
                  </text>

                  {/* X axis index labels */}
                  {data.length < 15 || idx % 2 === 0 ? (
                    <text
                      x={p.x}
                      y={height - padding + 16}
                      fill="var(--bio-dim)"
                      fontSize="8"
                      fontFamily="var(--font-code)"
                      textAnchor="middle"
                    >
                      {displayLabel}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* Base Outline Lines */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={axisStroke} strokeWidth="1.5" />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={axisStroke} strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    );
  }

  // 3) PIE CHART (Donut Variation)
  if (chartType === 'pie') {
    const total = yValues.reduce((acc, curr) => acc + curr, 0);
    let startAngle = 0;
    const radius = 62;
    const innerRadius = 38;
    const cx = width / 3;
    const cy = height / 2;

    return (
      <div className="bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] border border-white/[0.01] p-5 mt-4 rounded-2xl relative overflow-hidden">
        <h4 className="text-xs text-[var(--bio-ghost)] tracking-[1.5px] uppercase mb-1 font-bold">
          🍩 DISTRIBUTION: {yKey} BY {xKey}
        </h4>
        <div className="text-[8.5px] text-[var(--bio-coral)] mb-4 tracking-[1px] font-bold font-mono">
          SECTOR SPECTRUM • PROPORTION INDEXER
        </div>
        
        <div className="relative w-full h-[260px] flex items-center justify-center">
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            {data.map((item, idx) => {
              const val = Number(item[yKey]) || 0;
              const percent = total > 0 ? val / total : 0;
              const angleSize = percent * 360;
              
              const col = palette[idx % palette.length];
              
              // Segment vectors
              const x1 = cx + radius * Math.cos((startAngle - 90) * Math.PI / 180);
              const y1 = cy + radius * Math.sin((startAngle - 90) * Math.PI / 180);
              const x2 = cx + radius * Math.cos((startAngle + angleSize - 90) * Math.PI / 180);
              const y2 = cy + radius * Math.sin((startAngle + angleSize - 90) * Math.PI / 180);

              const ix1 = cx + innerRadius * Math.cos((startAngle - 90) * Math.PI / 180);
              const iy1 = cy + innerRadius * Math.sin((startAngle - 90) * Math.PI / 180);
              const ix2 = cx + innerRadius * Math.cos((startAngle + angleSize - 90) * Math.PI / 180);
              const iy2 = cy + innerRadius * Math.sin((startAngle + angleSize - 90) * Math.PI / 180);

              const largeArcFlag = angleSize > 180 ? 1 : 0;
              
              const pathD = `
                M ${x1} ${y1}
                A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                L ${ix2} ${iy2}
                A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}
                Z
              `;

              const labelAngle = startAngle + angleSize / 2;
              const lx = cx + (radius + 18) * Math.cos((labelAngle - 90) * Math.PI / 180);
              const ly = cy + (radius + 18) * Math.sin((labelAngle - 90) * Math.PI / 180);

              startAngle += angleSize;

              return (
                <g key={idx} className="group cursor-pointer">
                  {/* Segment Path Outline with Neumorphic flat contrast */}
                  <path
                    d={pathD}
                    fill={col}
                    fillOpacity="0.85"
                    stroke="var(--neu-bg)"
                    strokeWidth="2"
                    className="transition-all duration-200 hover:fill-opacity-100"
                  />

                  {/* Percentage lines */}
                  <line
                    x1={cx + (innerRadius + 4) * Math.cos((labelAngle - 90) * Math.PI / 180)}
                    y1={cy + (innerRadius + 4) * Math.sin((labelAngle - 90) * Math.PI / 180)}
                    x2={lx}
                    y2={ly}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />

                  {/* Text */}
                  <text
                    x={lx}
                    y={ly + 3}
                    fill="var(--bio-ghost)"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="var(--font-code)"
                    textAnchor={lx > cx ? "start" : "end"}
                  >
                    {Math.round(percent * 100)}%
                  </text>
                </g>
              );
            })}

            {/* Legend checklist on right hand side */}
            <g transform={`translate(${width - 170}, ${padding - 5})`}>
              {data.map((item, idx) => {
                const col = palette[idx % palette.length];
                const yPos = idx * 24;
                return (
                  <g key={idx} transform={`translate(0, ${yPos})`}>
                    <rect width="11" height="11" rx="3" fill={col} opacity="0.8" />
                    <text x="18" y="9.5" fill="var(--bio-ghost)" fontSize="9" fontWeight="bold" fontFamily="var(--font-code)">
                      {String(item[xKey]).substring(0, 15)}
                    </text>
                    <text x="145" y="9.5" fill="var(--bio-dim)" fontSize="8.5" fontFamily="var(--font-code)" textAnchor="end">
                      {Math.round(item[yKey]).toLocaleString()}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Central Donut Hole conforming to the panel background style */}
            <circle cx={cx} cy={cy} r={innerRadius - 4} fill="var(--neu-bg)" />
            <text x={cx} y={cy - 4} fill="var(--bio-dim)" fontSize="7" fontFamily="var(--font-code)" textAnchor="middle">TOTAL VALUE</text>
            <text x={cx} y={cy + 7} fill="var(--bio-teal)" fontSize="11" fontWeight="900" fontFamily="var(--font-code)" textAnchor="middle">
              {total > 1000000 ? `${(total / 1000000).toFixed(1)}M` : (total > 1000 ? `${(total / 1000).toFixed(0)}K` : total.toLocaleString())}
            </text>
          </svg>
        </div>
      </div>
    );
  }

  return null;
}
