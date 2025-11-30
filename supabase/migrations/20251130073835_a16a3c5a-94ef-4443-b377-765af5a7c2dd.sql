-- Update the check constraint on point_transactions to allow manual awards and deductions
ALTER TABLE point_transactions 
DROP CONSTRAINT IF EXISTS point_transactions_transaction_type_check;

ALTER TABLE point_transactions
ADD CONSTRAINT point_transactions_transaction_type_check 
CHECK (transaction_type IN ('referral_bonus', 'manual_award', 'manual_deduction', 'subscription_reward', 'video_tip', 'video_purchase'));