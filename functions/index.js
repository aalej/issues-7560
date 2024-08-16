import { onObjectFinalized } from "firebase-functions/v2/storage"
import { onDocumentWritten } from "firebase-functions/v2/firestore"
import { cert, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const app = initializeApp({
    credential: cert("./service-account.json")
})
const db = getFirestore(app)

export const onFileCreated = onObjectFinalized(async (event) => {
    // When a file is uploaded:
    //  - create a corresponding firestore document in /users/{userId}/files collection
    //  - set the id of the document as the filename

    // Extract the userId and filename from the full path
    const re = RegExp("^users/(?<userId>[^/]+)/files/(?<filename>[^/]+)$", "g")
    const match = re.exec(event.data.name)
    const { userId, filename } = match.groups

    await db.runTransaction(async (transaction) => {
        const dirname = `users/${userId}/files`
        const fileRef = db.collection(dirname).doc(filename)
        return transaction.set(fileRef, event.data, { merge: false })
    })
})

export const onFileDocWritten = onDocumentWritten(
    {
        document: "users/{userId}/files/{fileId}",
    },
    async (event) => {
        // Each time a file document is created, updated, or deleted:
        // - reflect the changes in the document users/<userId>/lists/files

        const fileOld = event.data.before.data()
        const fileNew = event.data.after.data()
        const { fileId, userId } = event.params

        await db.runTransaction(async (transaction) => {
            if (!fileOld && fileNew) {
                console.log("File doc was created")

            } else if (fileOld && !fileNew) {
                console.log("File doc was deleted")

            } else {
                console.log("File doc was updated or overwritten.")
            }

        }) // End of transaction
    })