import React, { createContext, useState, useContext, ReactNode } from "react";

// Define the shape of the user data
interface UserData {
  name: string;
  email: string;
  position: string;
  tradingStyle: string;
  timeframes: string;
  portfolioSize: string;
  riskTolerance: string;
  maxPositions: string;
  dailyLossLimit: string;
  psychologicalFlaws: string;
  otherInstructions: string;
  signupCode?: string;
  analysisInterval: string;
  analysisIntervalUnit: string;
  screenshot_interval?: number;  // in seconds
}

// Default state for a new user
const defaultUserData: UserData = {
  name: "",
  email: "",
  position: "",
  tradingStyle: "",
  timeframes: "",
  portfolioSize: "",
  riskTolerance: "",
  maxPositions: "",
  dailyLossLimit: "",
  psychologicalFlaws: "",
  otherInstructions: "",
  signupCode: "",
  analysisInterval: "",
  analysisIntervalUnit: "minute",
  screenshot_interval: 10  // default to 10 seconds
};

// Create the context
interface UserContextType {
  user: UserData;
  setUser: (user: UserData) => void;
}

const UserContext = createContext<UserContextType>({
  user: defaultUserData,
  setUser: () => {},
});

// Create the provider component
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData>(defaultUserData);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useUser = () => {
  return useContext(UserContext);
};
