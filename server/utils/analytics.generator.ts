import { Document, Model } from 'mongoose';
//this will show last 12 months analytics
interface MonthData {
	month: string;
	count: number;
}

export async function generateLast12MonthsData<T extends Document>(
	model: Model<T>
): Promise<{ last12Months: MonthData[] }> {
	const last12Months: MonthData[] = [];
	const currentDate = new Date();
	currentDate.setDate(currentDate.getDate() + 1); //curr date to tomorrow


	for (let i = 11; i >= 0; i--) { //starts from 11 as we starrt from 0 in prog
		const endDate = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			currentDate.getDate() - i * 28 //countng year as 28 days as all months doesnt have same no of days
		);//last 28 days data and updating everyday

		const startDate = new Date(
			endDate.getFullYear(),
			endDate.getMonth(),
			endDate.getDate() - 28
		);

		const monthYear = endDate.toLocaleString('default', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});

		const count = await model.countDocuments({
			createdAt: {
				$gte: startDate, //greater than
				$lt: endDate, //less than
			},
		});//count no of query that matched with this filter kind of fonging
		

		last12Months.push({ month: monthYear, count });
	}

	return { last12Months };
}