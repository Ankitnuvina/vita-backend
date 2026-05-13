// import multer from 'multer'
// import path from 'path'
// import fs from 'fs'

// const uploadPath = path.join(process.cwd(), 'uploads')

// if (!fs.existsSync(uploadPath)) {
//   fs.mkdirSync(uploadPath, { recursive: true })
// }

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     cb(null, uploadPath)
//   },

//   filename: (_req, file, cb) => {
//     const uniqueName =
//       Date.now() + '-' + file.originalname.replace(/\s+/g, '-')

//     cb(null, uniqueName)
//   },
// })

// export const upload = multer({
//   storage,

//   limits: {
//     fileSize: 5 * 1024 * 1024,
//   },

//   // fileFilter: (_req, file, cb) => {
//   //   if (file.mimetype.startsWith('image/')) {
//   //     cb(null, true)
//   //   } else {
//   //     cb(new Error('Only image files are allowed'))
//   //   }
//   // },
//   fileFilter: (_req, file, cb) => {
//   const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
//   cb(null, allowed.includes(file.mimetype))
// },
// })

import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadPath = path.join(process.cwd(), 'uploads')

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadPath)
  },
  filename: (_req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-')
    cb(null, uniqueName)
  },
})

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/webm']

export const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024,  // ← 200MB (video ke liye)
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [...IMAGE_TYPES, ...VIDEO_TYPES]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`))
    }
  },
})

// Image only upload (articles ke liye)
export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB image ke liye theek hai
  },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files allowed'))
    }
  },
})

// Video only upload (podcasts ke liye)
export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,  // 100MB
  },
  fileFilter: (_req, file, cb) => {
    if (VIDEO_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only video files allowed (mp4, webm)'))
    }
  },
})