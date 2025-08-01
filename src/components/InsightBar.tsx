import React from 'react';
// @ts-ignore
import { Rnd } from 'react-rnd';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface InsightBarProps {
  visible: boolean;
  onClose?: () => void;
}

const defaultWidth = 520;
const defaultHeight = 72;
const minWidth = 320;
const minHeight = 56;

const InsightBar: React.FC<InsightBarProps> = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <Rnd
      default={{
        x: 100,
        y: 100,
        width: defaultWidth,
        height: defaultHeight,
      }}
      minWidth={minWidth}
      minHeight={minHeight}
      bounds="window"
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      style={{ zIndex: 9999 }}
    >
      <Card className="glass-effect border border-white/30 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 backdrop-blur-md w-full h-full">
        {/* Insight placeholder */}
        <div className="flex-1 text-center text-white text-base font-medium">
          No insights yet.
        </div>
        {/* Chat toggle placeholder */}
        <Button variant="outline" size="sm" className="rounded-full px-3">💬 Chat</Button>
        {/* History button placeholder */}
        <Button variant="outline" size="sm" className="rounded-full px-3">History</Button>
        {/* Go to app button placeholder */}
        <Button variant="outline" size="sm" className="rounded-full px-3">Go to App</Button>
        {/* Optional close button */}
        {onClose && (
          <Button size="icon" variant="outline" onClick={onClose} className="ml-2">
            ×
          </Button>
        )}
      </Card>
    </Rnd>
  );
};

export default InsightBar; 