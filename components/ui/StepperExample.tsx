import React, { useState } from 'react';
import Stepper, { Step } from './Stepper';

const StepperExample: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const steps: Step[] = [
    { id: 1, label: 'Deal' },
    { id: 2, label: 'Add Context' },
    { id: 3, label: 'Generating SOW' },
    { id: 4, label: 'Generating Architecture' },
    { id: 5, label: 'Calculating TCO' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">SOW Generation Process</h1>

      <Stepper steps={steps} currentStep={currentStep} />

      {/* Example controls to test the stepper */}
      <div className="mt-8 flex gap-4 justify-center">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
        >
          Previous Step
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
          disabled={currentStep === steps.length}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
        >
          Next Step
        </button>
      </div>

      <div className="mt-8 text-center text-gray-600">
        Current Step: {currentStep} - {steps[currentStep - 1]?.label}
      </div>
    </div>
  );
};

export default StepperExample;
