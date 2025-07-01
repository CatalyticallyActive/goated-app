import React, { createContext, useState, useContext, ReactNode } from "react";

// Define the shape of the user data
interface UserData {
  name: string;
  email: string;
  age: string;
  position: string;
  tradingExperience: string;
  tradingFrequency: string;
  biggestProblems: string;
  tradingStyle: string;
  timeframes: string;
  portfolioSize: string;
  riskTolerance: string;
  maxPositions: string;
  dailyLossLimit: string;
  psychologicalFlaws: string;
  otherInstructions: string;
  signupCode?: string;
  // Add other fields from your forms as needed
}

// Default state for a new user
const defaultUserData: UserData = {
  name: "",
  email: "",
  age: "",
  position: "",
  tradingExperience: "",
  tradingFrequency: "",
  biggestProblems: "",
  tradingStyle: "",
  timeframes: "",
  portfolioSize: "",
  riskTolerance: "",
  maxPositions: "",
  dailyLossLimit: "",
  psychologicalFlaws: "",
  otherInstructions: "",
  signupCode: "",
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
