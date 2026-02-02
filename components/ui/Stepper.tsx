import React from 'react';
import { Check } from 'lucide-react';

export interface Step {
  id: number;
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step circle + label group */}
              <div className="flex items-center gap-2">
                {/* Step circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 flex-shrink-0 ${
                    isCompleted
                      ? 'bg-brand-positives-80 text-white'
                      : isActive
                      ? 'bg-white border-2 border-violet-950 text-neutral-800'
                      : 'bg-neutral-200 text-brand-black'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={`text-[14px] font-medium whitespace-nowrap transition-colors duration-300 ${
                    isCompleted || isActive ? 'text-violet-950' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (not after last step) */}
              {!isLast && (
                <div className="mx-4 h-0.5 w-[40px]">
                  <div
                    className={`h-full transition-colors duration-300 ${
                      isCompleted ? 'bg-brand-positives-80' : 'bg-violet-200'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
