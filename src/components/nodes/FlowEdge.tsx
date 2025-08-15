import { memo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

export const FlowEdge = memo((props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style } = props;

  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <g>
      {/* Animated dotted edge path - LIVE flowing animation */}
      <BaseEdge 
        id={id} 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          stroke: '#6b7280', 
          strokeWidth: 2,
          strokeDasharray: '8 4',
          strokeLinecap: 'round',
          animation: 'dash-flow 2s linear infinite',
          ...style 
        }} 
      />
      
      {/* CSS Animation for flowing dots */}
      <style>{`
        @keyframes dash-flow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -24; }
        }
      `}</style>
    </g>
  );
});

FlowEdge.displayName = 'FlowEdge';
