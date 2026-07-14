"use client";
import { useState } from "react";

interface ExpandableListProps {
  data: any[];
  titleKey: string;
  valueKey: string;
  color: "blue" | "green";
  subGroupKey?: string;
}

export default function ExpandableList({ data, titleKey, valueKey, color, subGroupKey }: ExpandableListProps) {
  // Group data by kabupaten
  const groupedData = data.reduce((acc: Record<string, any[]>, curr) => {
    if (!acc[curr.kabupaten]) acc[curr.kabupaten] = [];
    acc[curr.kabupaten].push(curr);
    return acc;
  }, {});

  const sortedKabupatens = Object.keys(groupedData).sort();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedSub, setExpandedSub] = useState<Record<string, boolean>>({});

  const toggleExpand = (kab: string) => {
    setExpanded(prev => ({ ...prev, [kab]: !prev[kab] }));
  };

  const toggleExpandSub = (subKey: string) => {
    setExpandedSub(prev => ({ ...prev, [subKey]: !prev[subKey] }));
  };

  const isBlue = color === "blue";
  const headerBg = isBlue ? "bg-blue-50 hover:bg-blue-100 text-blue-900" : "bg-green-50 hover:bg-green-100 text-green-900";
  const iconColor = isBlue ? "text-blue-500" : "text-green-500";
  const badgeBg = isBlue ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800";
  
  const subHeaderBg = "bg-gray-50 hover:bg-gray-100 text-gray-800";
  const subIconColor = "text-gray-500";

  if (!data || data.length === 0) {
    return <div className="text-gray-500 italic p-4 text-center">Data tidak tersedia.</div>;
  }

  const renderTable = (items: any[]) => (
    <div className="bg-white p-4">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr>
            <th className="py-2 text-left font-medium text-gray-500">{titleKey.charAt(0).toUpperCase() + titleKey.slice(1)}</th>
            <th className="py-2 text-right font-medium text-gray-500">Nilai LQ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="py-2 text-gray-700 font-medium">
                {item[titleKey]}
              </td>
              <td className="py-2 text-right font-semibold text-gray-900">{item[valueKey]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {sortedKabupatens.map((kab) => {
        const items = groupedData[kab];
        const isExpanded = !!expanded[kab];

        return (
          <div key={kab} className="border-b border-gray-200 last:border-b-0">
            <button
              onClick={() => toggleExpand(kab)}
              className={`w-full flex items-center justify-between p-4 text-left transition-colors ${headerBg}`}
            >
              <div className="flex items-center">
                <svg 
                  className={`w-5 h-5 mr-3 transition-transform duration-200 ${iconColor} ${isExpanded ? "rotate-90" : ""}`} 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-semibold">{kab}</span>
              </div>
              <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeBg}`}>
                {items.length} {titleKey}
              </div>
            </button>
            
            {isExpanded && (
              subGroupKey ? (
                // Multi-level rendering
                <div className="border-t border-gray-100 bg-white">
                  {(() => {
                    const subGroups = items.reduce((acc: Record<string, any[]>, curr) => {
                      const subVal = curr[subGroupKey] || "Lainnya";
                      if (!acc[subVal]) acc[subVal] = [];
                      acc[subVal].push(curr);
                      return acc;
                    }, {});
                    
                    return Object.keys(subGroups).sort().map(subName => {
                      const subItems = subGroups[subName];
                      const sKey = `${kab}-${subName}`;
                      const isSubExpanded = !!expandedSub[sKey];
                      
                      return (
                        <div key={sKey} className="border-b border-gray-100 last:border-b-0 ml-4">
                          <button
                            onClick={() => toggleExpandSub(sKey)}
                            className={`w-full flex items-center justify-between p-3 text-left transition-colors ${subHeaderBg}`}
                          >
                            <div className="flex items-center">
                              <svg 
                                className={`w-4 h-4 mr-2 transition-transform duration-200 ${subIconColor} ${isSubExpanded ? "rotate-90" : ""}`} 
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-sm font-medium">{subName}</span>
                            </div>
                            <span className="text-xs text-gray-500">{subItems.length} {titleKey}</span>
                          </button>
                          {isSubExpanded && renderTable(subItems)}
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                // Single-level rendering
                renderTable(items)
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
