import { Request, Response, NextFunction } from 'express';
import ErrorHandler from '../utils/ErrorHandler';
import { CatchAsyncError } from '../middleware/catchAsyncErrors';
import LayoutModel from '../models/layout.model';
import cloudinary from 'cloudinary';

// create layout
export const createLayout = CatchAsyncError(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { type } = req.body;

            const isTypeExist = await LayoutModel.findOne({type});

            if(isTypeExist) {
                return next (new ErrorHandler(`${type} already exist`,400))
            }

			if (type === 'Banner') { //banner is a obj where we have img, title, sub title
				const { image, title, subTitle } = req.body;
                
                //upload img
				const myCloud = await cloudinary.v2.uploader.upload(image, {
					folder: 'layout',
				});
                
                //after upload we have banner object with img
				const banner = {
					image: {
						public_id: myCloud.public_id,
						url: myCloud.secure_url,
					},
					title,
					subTitle,
				};

				await LayoutModel.create(banner);
			}
            
            if(type === "FAQ") {
                //take the faq with question and answer from backend
                const {faq} = req.body
                const faqItems = await Promise.all(
                    faq.map(async(item:any) => {
                        return {
                            question: item.question,
                            answer:item.answer
                        }
                    })
                )
                await LayoutModel.create({type:"FAQ", faq:faqItems});
            }

            if(type ==="Categories"){
                const {categories} = req.body;
                const categoriesItems = await Promise.all(
                    categories.map(async(item:any) => {
                        return {
                            title:item.title,
                        }
                    })
                )
                await LayoutModel.create({type:"Categories", categories: categoriesItems})
            }

            res.status(200).json({
                success:true,
                message:"Layout Created Successfully"
            })
		} catch (error: any) {
			return next(new ErrorHandler(error.message, 500));
		}
	}
);


// Edit Layout 

export const editLayout = CatchAsyncError(async (req:Request, res:Response, next:NextFunction) => {
    try {
        const { type } = req.body;

        if (type === 'Banner') {
//any is type as in typescript we have to write type
            const bannerData:any =  await LayoutModel.findOne({type: "Banner"})

            const { image, title, subTitle } = req.body;

            if(bannerData){
                await cloudinary.v2.uploader.destroy(bannerData.image.public_id)
            }

            const myCloud = await cloudinary.v2.uploader.upload(image, {
                folder: 'layout',
            });

            const banner = {
                image: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                },
                title,
                subTitle,
            };

            await LayoutModel.findByIdAndUpdate(bannerData.id,{banner});
        }
        
        if(type === "FAQ") {
            const {faq} = req.body
            const faqPreItem = await LayoutModel.findOne({type:"FAQ"})
            const faqItems = await Promise.all(
                faq.map(async(item:any) => {
                    return {
                        question: item.question,
                        answer:item.answer
                    }
                })
            )
            await LayoutModel.findByIdAndUpdate(faqPreItem?._id,{type:"FAQ", faq:faqItems});
        }

        if(type ==="Categories"){
            const {categories} = req.body;
            const categoriesPreItem = await LayoutModel.findOne({type:"Categories"})

            const categoriesItems = await Promise.all(
                categories.map(async(item:any) => {
                    return {
                        title:item.title,
                    }
                })
            )
            await LayoutModel.findByIdAndUpdate(categoriesPreItem?._id,{type:"Categories", categories: categoriesItems})
        }

        res.status(200).json({
            success:true,
            message:"Layout Update Successfully"
        })
    } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
    }
})

// get layout by type 

export const getLayoutByType = CatchAsyncError(async(req:Request, res:Response, next: NextFunction) => {
    try {
        const {type} = req.body
        const layout = await LayoutModel.findOne({type});
        res.status(201).json({
            success:true,
            layout
        })
    } catch (error:any) {
        return next(new ErrorHandler(error.message, 500))
        
    }
})