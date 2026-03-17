import { db } from '../firebase';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    getDocs,
    query,
    where,
} from 'firebase/firestore';

export type NutritionalData = {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    salt: number;
    fiber: number;
};

export type MealRecord = {
    id: string;
    date: string; // YYYY-MM-DD
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    imageUrl?: string;
    comment?: string;
    name: string;
    nutritionalData: NutritionalData;
    status: 'analyzing' | 'needs_clarification' | 'confirmed';
    questions?: string;
    createdAt: number;
};

export async function saveMealRecord(meal: MealRecord) {
    const mealRef = doc(db, 'meals', meal.id);
    await setDoc(mealRef, meal);
}

export async function updateMealRecord(id: string, updates: Partial<MealRecord>) {
    const mealRef = doc(db, 'meals', id);
    await updateDoc(mealRef, updates);
}

export async function getMealsByDate(date: string): Promise<MealRecord[]> {
    const mealsCol = collection(db, 'meals');
    const q = query(
        mealsCol,
        where('date', '==', date)
    );

    const snapshot = await getDocs(q);
    const meals = snapshot.docs.map(doc => doc.data() as MealRecord);
    return meals.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getMealsByDateRange(startDate: string, endDate: string): Promise<MealRecord[]> {
    const mealsCol = collection(db, 'meals');
    const q = query(
        mealsCol,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );

    const snapshot = await getDocs(q);
    const meals = snapshot.docs.map(doc => doc.data() as MealRecord);
    return meals.sort((a, b) => a.createdAt - b.createdAt);
}
