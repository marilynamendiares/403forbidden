import ShellFrame from "@/app/ShellFrame";
import ShellProviders from "@/app/shell/ShellProviders";

type Props = {
  topBar?: React.ReactNode;
  children: React.ReactNode;
};

export default function ShellRoot({ topBar, children }: Props) {
  return (
    <ShellProviders>
      <ShellFrame topBar={topBar}>{children}</ShellFrame>
    </ShellProviders>
  );
}
