/**
 * Restore Sudharshan's transactions to the exact original passbook dates
 * as shown in the passbook image and align DOJ:
 *   1st:  10-11-2025 (Nov 2025)
 *   2nd:  02-12-2025 (Dec 2025)
 *   3rd:  02-01-2026 (Jan 2026)
 *   4th:  03-02-2026 (Feb 2026)
 *   5th:  02-03-2026 (March 2026)
 *   6th:  02-05-2026 (May 2026)
 *   7th:  02-06-2026 (June 2026)
 *   8th:  01-07-2026 (July 2026)
 */
const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function restoreSudharshan() {
    console.log("=== Restoring SUDHARSHAN.B passbook dates and DOJ ===\n");
    const batch = db.batch();

    // Ensure scheme enrollmentDate matches 1st installment
    const schemeRef = db.collection('user_schemes').doc('jv7ZcHi2DeoUVQ9k8AUJ');
    batch.update(schemeRef, {
        enrollmentDate: '10-11-2025',
        createdAt: '2025-11-10T10:00:00.000Z',
        totalPaid: 12000,
        monthsPaid: 8
    });

    const corrections = [
        { id: 'PqxxuHVEMXrhfHFjjN6J', date: '10-11-2025', timestamp: '2025-11-10T10:00:00.000Z', label: '1st installment (Nov)' },
        { id: 'Jdlm6iw4ICAflw6NTxh0', date: '02-12-2025', timestamp: '2025-12-02T10:00:00.000Z', label: '2nd installment (Dec)' },
        { id: 'WfSx2EwKhyvFyxJZhkTX', date: '02-01-2026', timestamp: '2026-01-02T10:00:00.000Z', label: '3rd installment (Jan)' },
        { id: 'CvSUcjFyUfladNDof0jg', date: '03-02-2026', timestamp: '2026-02-03T10:00:00.000Z', label: '4th installment (Feb)' },
        { id: 'QvFKYee1RGOBMb75yF2H', date: '02-03-2026', timestamp: '2026-03-02T10:00:00.000Z', label: '5th installment (Mar)' },
        { id: 'YHGrVbtBAxkNijZ5Hah6', date: '02-05-2026', timestamp: '2026-05-02T10:00:00.000Z', label: '6th installment (May)' },
        { id: 'eaKdvRCXh1PiuOy9zoGZ', date: '02-06-2026', timestamp: '2026-06-02T10:00:00.000Z', label: '7th installment (Jun)' },
        { id: 'FYUACXHb9ejyLxgDdS9z', date: '01-07-2026', timestamp: '2026-07-01T10:00:00.000Z', label: '8th installment (Jul)' },
    ];

    for (const c of corrections) {
        console.log(`Updating TX ${c.id}: → ${c.date} (${c.label})`);
        batch.update(db.collection('transactions').doc(c.id), {
            date: c.date,
            timestamp: c.timestamp,
            status: 'Success'
        });
    }

    await batch.commit();
    console.log("\n✅ Done! SUDHARSHAN.B dates restored and aligned!");
    process.exit(0);
}

restoreSudharshan().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
