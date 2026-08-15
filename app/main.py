import joblib
import os
from fastapi import FastAPI
from pydantic import BaseModel,Field
from typing import Literal
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware


print("Current Working Directory:")
print(os.getcwd())

print("\nModel Path:")
print(os.path.abspath("extra_trees_default.pkl"))

model = joblib.load("extra_trees_default.pkl")

print("\nLoaded Model:")
print(model)

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def greet():
    return {"message": "Welcome to the Student Health Score Prediction API!"}

class InputData(BaseModel):
    Age                     : int = Field(..., gt=0,le=100, description="Age of the student in years")
    Gender                  : Literal['Male', 'Female']
    Country                 : str = Field(..., description="Country of the student")
    Academic_Level          : Literal['Undergraduate', 'Graduate', 'High School']
    Most_Used_Platform      : Literal['Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter','YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp','WeChat']
    Purpose_Of_Use          : Literal['Networking', 'Education', 'Entertainment', 'News']
    Avg_Daily_Usage_Hours   : float = Field(..., gt=0, le=24, description="Average daily usage hours of the platform")
    Daily_Unlocks           : int = Field(..., gt=0, description="Number of times the platform is unlocked per day")
    Study_Hours             : float = Field(..., gt=0,le = 24, description="Number of hours spent studying per day")
    Physical_Activity_Hours : float = Field(..., gt=0,le = 24, description="Number of hours spent on physical activity per day")
    Sleep_Hours_Per_Night   : float = Field(..., gt=0, le=24, description="Number of hours slept per night")
    Stress_Level            : Literal['Medium', 'Low', 'Very High', 'High']



top_countries = ['Other','India','USA','Canada','Australia','UK','Germany','Turkey','Mexico','France']



class PredictionResponse(BaseModel):
    predicted_mental_health_score: float


@app.post("/predict",response_model=PredictionResponse)
def predict(data: InputData):

    country_group = data.Country if data.Country in top_countries else 'Other'

    input_row = pd.DataFrame([
        {
            'Age'                     : data.Age,
            'Gender'                  : data.Gender,
            'Country'                 : data.Country,
            'Academic_Level'          : data.Academic_Level,
            'Most_Used_Platform'      : data.Most_Used_Platform,
            'Purpose_Of_Use'          : data.Purpose_Of_Use,
            'Avg_Daily_Usage_Hours'   : data.Avg_Daily_Usage_Hours,
            'Daily_Unlocks'           : data.Daily_Unlocks,
            'Study_Hours'             : data.Study_Hours,
            'Physical_Activity_Hours' : data.Physical_Activity_Hours,
            'Sleep_Hours_Per_Night'   : data.Sleep_Hours_Per_Night,
            'Stress_Level'            : data.Stress_Level,
            'Grouped_country'         : country_group
        }
    ])

    prediction = model.predict(input_row)[0]
    return PredictionResponse(
    predicted_mental_health_score=round(float(prediction), 3)
    )

    