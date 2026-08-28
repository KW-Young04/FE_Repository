import Button from "@/components/Button";
import Modal from "@/components/Modal";

interface LoginErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginErrorModal({ isOpen, onClose }: LoginErrorModalProps) {
  return (
    <Modal isOpen={isOpen} size="sm" onBackdropClick={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-extrabold text-slate-900">GitHub에 로그인 할 수 없습니다.</h2>
        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
          GitHub 로그인 중 오류가 발생해 로그인을 완료하지 못했습니다.
          <br />
          잠시 후 다시 시도해 보시고, 같은 문제가 지속되면 문의해 주세요.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          GitHub 계정이 없으신가요? 가입 후 이용해 주세요.
        </p>
        <Button onClick={onClose} variant="blue" className="mt-6 h-12 w-full rounded-lg text-lg">
          확인
        </Button>
      </div>
    </Modal>
  );
}
